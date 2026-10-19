// Browser contract test: provider consent is simulated, never uses real credentials.
const {chromium, expect} = require('@playwright/test');
const {createHash} = require('node:crypto');
(async()=>{
 const browser=await chromium.launch();
 try {
  for(const provider of ['google','github','discord']){
   const page=await browser.newPage({viewport:{width:1100,height:900}});
   const base=process.env.TEST_WEB_URL || 'http://localhost:8082';
   let challenge, exchanges=0;
   await page.route('**/api/**', async route=>{
    const url=new URL(route.request().url());
    let data;
    if(url.pathname.endsWith('/providers')) data={google:true,github:true,discord:true};
    else if(url.pathname.endsWith(`/${provider}/start`)){
     const body=route.request().postDataJSON();
     expect(body.platform).toBe('web');challenge=body.challenge;
     data={url:`${base}/oauth?ticket=${'a'.repeat(64)}`};
    }else if(url.pathname.endsWith('/exchange')){
     const body=route.request().postDataJSON();
     expect(createHash('sha256').update(body.verifier).digest('base64url')).toBe(challenge);
     expect(body.ticket).toBe('a'.repeat(64));exchanges++;
     data={requiresMfa:true,challengeId:'test-mfa'};
    }else throw Error(`Unexpected request: ${url.pathname}`);
    await route.fulfill({json:{success:true,data}});
   });
   await page.goto(`${base}/register`);
   await page.getByRole('button',{name:`Continuar con ${provider[0].toUpperCase()+provider.slice(1)}`,exact:true}).click();
   await expect(page).toHaveURL(/second-factor/,{timeout:20000});
   expect(exchanges).toBe(1);
   expect(await page.evaluate(()=>sessionStorage.getItem('stockflow.oauth'))).toBeNull();
   await page.close();
  }
  const newUserPage=await browser.newPage();
  const base=process.env.TEST_WEB_URL || 'http://localhost:8082';
  let newUserExchanges=0;
  await newUserPage.route('**/api/**', async route=>{
    const path=new URL(route.request().url()).pathname;
    let data;
    if(path.endsWith('/providers')) data={google:true,github:true,discord:true};
    else if(path.endsWith('/google/start')) data={url:`${base}/oauth?ticket=${'b'.repeat(64)}`};
    else if(path.endsWith('/exchange')) {
      newUserExchanges++;
      data={accessToken:'test-access',refreshToken:'test-refresh',user:{id:42,nombre:'Nueva cuenta',email:'new@example.test',email_verificado:true,segundo_factor:false}};
    } else if(path.endsWith('/businesses')) {
      await new Promise(resolve=>setTimeout(resolve,500));
      data={items:[]};
    } else if(path.endsWith('/invitations')) data={items:[]};
    else throw Error(`Unexpected new-user request: ${path}`);
    await route.fulfill({json:{success:true,data}});
  });
  await newUserPage.goto(`${base}/register`);
  await newUserPage.getByRole('button',{name:'Continuar con Google',exact:true}).click();
  await expect(newUserPage).toHaveURL(/\/businesses$/, {timeout:10000});
  await expect(newUserPage.getByRole('button',{name:'Crear negocio',exact:true})).toBeVisible();
  expect(newUserExchanges).toBe(1);
  await newUserPage.close();
  const retryPage=await browser.newPage();
  await retryPage.route('**/api/auth/social/**', route=>route.abort('failed'));
  await retryPage.goto(`${process.env.TEST_WEB_URL || 'http://localhost:8082'}/register`);
  await expect(retryPage.getByText(/No se pudo conectar con el servidor/)).toBeVisible();
  const retryButton=retryPage.getByRole('button',{name:'Continuar con Google',exact:true});
  await retryButton.click();
  await expect(retryButton).toBeEnabled();
  await expect(retryPage.getByText('Conectando con la plataforma…')).toHaveCount(0);
  await retryPage.close();
  const page=await browser.newPage({viewport:{width:1100,height:900}});
  await page.goto(`${process.env.TEST_WEB_URL || 'http://localhost:8082'}/oauth?error=ACCOUNT_EXISTS`);
  await expect(page.getByText(/Este correo ya tiene una cuenta/)).toBeVisible();
  console.log('OAuth web OK: Google/GitHub/Discord desde registro, prueba de posesión, retorno MFA, consumo único y error de cuenta existente. Consentimiento externo simulado.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
