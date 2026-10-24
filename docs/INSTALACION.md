# Instalación desde cero

## Requisitos

Instalar Node.js compatible con el SDK de Expo usado (este workspace se probó con Node 26.3.1), npm y MySQL 8.4. Descargar Node desde https://nodejs.org y MySQL desde https://dev.mysql.com/downloads/mysql/. En Windows reiniciar la terminal tras instalar y comprobar `node --version`, `npm --version`, `mysql --version`.

macOS permite `brew install node mysql@8.4`. Android Studio y su SDK son necesarios para un emulador o compilación local; EAS Cloud compila remotamente. No basta con tener el ejecutable `/usr/bin/java`: en esta revisión no había un runtime Java instalado.

## Backend y MySQL

1. Entrar a `stockflow/backend` y ejecutar `npm ci`.
2. Iniciar MySQL. Aplicar `mysql -u root -p < database/schema.sql`. En PowerShell abrir el cliente y usar `SOURCE C:/ruta/stockflow/backend/database/schema.sql;`.
3. Copiar `.env.example` a `.env`: macOS `cp .env.example .env`; PowerShell `Copy-Item .env.example .env`.
4. Generar dos secretos independientes: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Repetir para access y refresh. Nunca subir `.env` a Git.
5. Aplicar `npm run migrate` con un usuario administrador de esquema configurado temporalmente en el entorno. MySQL hace commits implícitos de DDL: si una migración falla a mitad, revisar y reparar antes de reintentar. No borrar la base.
6. Editar la contraseña de ejemplo de `database/create_user.sql` y ejecutarlo como administrador. La API usa `stockflow_app`, solo SELECT/INSERT/UPDATE/DELETE.
7. El seed es opcional y se ejecuta después de crear un negocio desde la app: `SEED_BUSINESS_ID=ID npm run seed`. Reemplazar ID por un negocio activo propio. Agrega una categoría, un proveedor y dos productos con stock cero; es repetible dentro de ese negocio. En PowerShell establecer primero `$env:SEED_BUSINESS_ID='ID'`.
8. `npm run typecheck`, `npm test`, `npm run build`, `npm start`. Desarrollo: `npm run dev`.
9. Comprobar `http://localhost:3000/api/health`.

Variables del backend: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME; JWT_ACCESS_SECRET y JWT_REFRESH_SECRET distintos; PORT; NODE_ENV; CORS_ORIGINS separado por comas; SMTP y OAuth detallados más abajo. MySQL guarda y consulta fechas en UTC.

### Instalación local conservada

La base `stockflow` y el usuario restringido ya existen en este equipo. El `.env` local se conservó al mover la carpeta. Desde el 21/10/2026 MySQL escucha en el puerto 3306 mediante `brew services start mysql@8.4`; el `.env` local usa ese puerto. Antes de la migración 007 se guardó una copia con permisos de propietario en `/Users/renzo/Downloads/stockflow-pre-distribuidora-2026-10-21.sql` (no subirla a Git). Para arrancar MySQL:

```sh
brew services start mysql@8.4
```

Homebrew inicializó root local sin contraseña en la etapa anterior. Proteger la cuenta administrativa antes de usar este equipo como servidor. La API tiene su propia contraseña aleatoria y no usa root.

## SMTP, verificación y segundo factor

Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Usar una cuenta SMTP autorizada y remitente verificado por el proveedor. Puerto 465 usa TLS desde el inicio; 587 negocia STARTTLS; NODE_ENV=production exige TLS. No poner credenciales SMTP en variables EXPO_PUBLIC.

Sin SMTP los envíos responden 503; no se imprimen códigos ni se habilita una puerta de acceso alternativa. El registro crea cuenta y luego la pantalla solicita el envío de verificación. Se requiere verificar antes de acceder al inventario. Para 2FA, ir al perfil y activar con código; se aplica al login local y social.

Para desarrollo puede usarse un servidor SMTP local de captura (por ejemplo Mailpit, configurado por el usuario), apuntando SMTP_HOST/PORT a ese servicio. Su bandeja es únicamente de desarrollo. Las pruebas automatizadas ya incluyen un SMTP local efímero y no entregan mensajes al exterior.

## Primera distribuidora y administrador

Registrar y verificar una cuenta propia, entrar y pulsar Crear distribuidora. La API crea la distribuidora y su membresía administradora en una transacción. El rol pertenece a esa distribuidora: modificar `usuarios.rol_id` no concede permisos. Invitar integrantes desde Equipo. La migración 005 conserva inventario anterior en una distribuidora histórica inactiva sin propietario; consultar [Multinegocio](MULTINEGOCIO.md) antes de asignarlo.

## Frontend

Desde `stockflow/mobile`, ejecutar `npm ci`; copiar `.env.example` a `.env` y configurar `EXPO_PUBLIC_API_URL` terminando en `/api`:

- Emulador Android: `http://10.0.2.2:3000/api`.
- Teléfono físico: `http://IP_LAN_DE_LA_COMPUTADORA:3000/api`, misma red Wi-Fi y firewall permitiendo el puerto.
- Web local: `http://127.0.0.1:3000/api`, con origen web permitido en CORS_ORIGINS.
- Presentación remota: `https://DOMINIO_DEL_BACKEND/api` con certificado válido.

`npm start` abre Metro; `npm run web` sirve la vista web. Reiniciar Metro si cambia una variable pública. `npx expo start --dev-client` conecta una development build. No asumir OAuth en Expo Go; usar una build con esquema propio `stockflow`.

SecureStore guarda tokens en Android. Web mantiene los tokens en memoria y solicita login tras recargar; es intencional para no colocar refresh tokens en localStorage.

## Google, GitHub y Discord

El flujo implementado usa navegador del sistema → callback HTTPS del backend → deep link `stockflow://oauth`. No requiere secretos en el móvil. Configurar `PUBLIC_API_URL=https://DOMINIO_DEL_BACKEND` **sin `/api` final**.

| Proveedor | Configuración en consola | Callback exacto |
|---|---|---|
| Google | Google Cloud Console → APIs y servicios → credenciales → cliente OAuth de aplicación web; pantalla de consentimiento, scopes openid/email/profile, usuarios de prueba | `https://DOMINIO_DEL_BACKEND/api/auth/social/google/callback` |
| GitHub | Settings → Developer settings → OAuth Apps → New OAuth App; permisos read:user y user:email | `https://DOMINIO_DEL_BACKEND/api/auth/social/github/callback` |
| Discord | Developer Portal → aplicación → OAuth2; scopes identify y email; no necesita bot | `https://DOMINIO_DEL_BACKEND/api/auth/social/discord/callback` |

Copiar IDs y secretos reales a GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET y DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET del backend. Google utiliza cliente web porque el canje está en servidor; esta implementación no usa SDK nativo ni SHA fingerprint Android.

Si el correo del proveedor coincide con una cuenta existente y el proveedor lo confirma como verificado, StockFlow vincula ese método social y permite iniciar sesión en la cuenta existente, conservando sus datos y permisos. Si el proveedor no confirma el correo, la vinculación se rechaza para proteger la cuenta. Si no viene email, el flujo falla sin crear una identidad incompleta.

Fuentes oficiales consultadas: [Expo OAuth](https://docs.expo.dev/guides/authentication/), [Google Web Server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Google UserInfo](https://developers.google.com/identity/openid-connect/reference), [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps). La documentación de Meta devolvió 429 durante esta revisión; revisar su [flujo manual](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/) al configurar credenciales.

## EAS y APK

El proyecto EAS ya está vinculado a `@renzomaggi/stockflow-estanga` (ID en `mobile/app.config.ts`). Todavía no se ejecutó un build.

1. Crear un servicio web Node en Render a partir de este repositorio, usando `render.yaml`. Render ofrece un subdominio HTTPS `onrender.com`; completar allí los valores sensibles marcados `sync: false`. La guía oficial es [Deploy a Node Express App](https://render.com/docs/deploy-node-express-app). No subir `.env` a Git. Antes de iniciar la API pública, aplicar la migración 007 a la base MySQL remota con un usuario autorizado para DDL; hacer backup antes. El `stockflow_app` local solo tiene DML y no puede migrar.
2. Configurar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`; usar los datos de Aiven en Render. Configurar `PUBLIC_API_URL=https://TU-SERVICIO.onrender.com`, `WEB_APP_URL` y `CORS_ORIGINS` para el origen web; SMTP y OAuth quedan exclusivamente en el backend. Comprobar `https://TU-SERVICIO.onrender.com/api/health` y un login real desde el teléfono.
3. En Expo EAS, configurar `EXPO_PUBLIC_API_URL=https://TU-SERVICIO.onrender.com/api` para el entorno de build `preview`. La URL se inserta en el bundle y no es secreta; [Expo documenta las variables EAS](https://docs.expo.dev/eas/environment-variables/). `EAS_PROJECT_ID` ya tiene valor predeterminado en la configuración. No poner credenciales de base, SMTP ni OAuth en `EXPO_PUBLIC_`.
4. Revisar la cuota del plan y ejecutar `npx eas-cli@24.12.1 build --platform android --profile preview`. `preview` pide APK según [Expo](https://docs.expo.dev/build-reference/apk/).
5. Configurar firma Android cuando EAS la solicite. Guardar claves/credenciales fuera de Git. Paquete `com.estanga.stockflow`; comprobar disponibilidad antes de publicar en una tienda.
6. Descargar el archivo `.apk` del build exitoso, verificar su existencia y transferirlo al teléfono. Autorizar instalación desde esa fuente según Android.
7. Probar registro/verificación/login, cada rol, CRUD, movimientos, 2FA, OAuth y reinicio de app. Apagar y encender red para comprobar errores y recuperación.

`npm run export:android` produce JavaScript/Hermes, **no APK**. `npx expo prebuild --platform android --no-install` genera archivos nativos, **no compila**. Ambos pasos se ejecutaron. Local build exige Java y Android SDK, ausentes en esta revisión. La configuración de release bloquea una API sin HTTPS o apuntando a loopback/emulador. Desarrollo habilita HTTP para la red local.

## Pruebas

Backend: `npm test` no necesita MySQL; `TEST_DB_PORT=3306 npm run test:integration` crea y elimina bases nuevas `stockflow_test_*`. Las credenciales de pruebas deben permitir crear/eliminar bases temporales. En PowerShell: `$env:TEST_DB_PORT='3306'`; después ejecutar el comando.

Móvil: `npm test` prueba el gestor de sesión con HTTP real y almacenamiento de prueba. `npm run typecheck`; `npm run export:android`.

Interfaz web automatizada, dos terminales desde mobile:

```sh
EXPO_PUBLIC_API_URL=http://127.0.0.1:3001/api npx expo start --web --port 8082
```

```sh
npx playwright install chromium
TEST_DB_PORT=3306 npm run test:e2e
```

El test nuevo crea cuatro cuentas artificiales verificadas solo en su base temporal, inicia API en 3001, recorre las pantallas de cliente, pedido multiproducto, preparación, asignación y entrega, y limpia los datos. No usa la base de desarrollo ni prueba entrega externa de correo. No ejecutar mientras 3001 esté ocupado.

## Seguridad y despliegue

No exponer MySQL a Internet. TLS debe terminar en el backend o proxy autorizado; configurar proxy de confianza solo para esa infraestructura. CORS debe contener el origen web exacto y no reemplaza autorización. Respaldar MySQL, limitar permisos, gestionar secretos fuera de Git y revisar dependencias antes de producción.

Hay avisos npm pendientes en dependencias transitivas de compilación de Expo, detallados en ESTADO_PROYECTO.md. No aplicar `npm audit fix --force` indiscriminadamente: proponía degradar Expo a una versión incompatible. El proyecto no se declara listo para producción ni presentación final hasta cerrar los bloqueos de la checklist.

## Actualización: Discord y Aiven

Discord sustituye a Facebook en la configuración actual. Crear una aplicación OAuth2 en Discord, registrar `/api/auth/social/discord/callback` bajo la URL pública del backend y configurar `DISCORD_CLIENT_ID` y `DISCORD_CLIENT_SECRET`. Los permisos solicitados por el código son `identify email`; no requiere bot. Aplicar migración `003_discord.sql` con el usuario administrador de esquema.

MySQL remoto admite `DB_SSL=true` y `DB_SSL_CA_FILE=/ruta/al/ca.pem`. La validación de certificados permanece obligatoria. Las credenciales Aiven locales se guardan en `.env.aiven` ignorado por Git; no se carga automáticamente, para preservar la base de desarrollo. Configurar el entorno remoto de forma explícita antes de migrar. No usar las credenciales remotas en pruebas automatizadas.

Si Brevo devuelve `525 Unauthorized IP address`, revisar el correo de seguridad y la configuración de IP autorizadas en Brevo. Autorizar la actividad legítima del equipo/servidor y repetir la verificación SMTP. El usuario SMTP debe ser el login del panel, y la contraseña una clave SMTP.

## Retorno social en navegador

Configurar `WEB_APP_URL=http://localhost:8081` localmente, o el origen HTTPS exacto del frontend publicado. Aplicar migración 004. Los callbacks registrados en Google/GitHub/Discord siguen apuntando al backend `/api/auth/social/PROVEEDOR/callback`; el backend redirige después a `/oauth` del frontend o al esquema nativo según la plataforma que inició la solicitud. No intercambiar localhost y 127.0.0.1 en el frontend durante el flujo: el verificador temporal pertenece al origen y pestaña que inició el acceso.
