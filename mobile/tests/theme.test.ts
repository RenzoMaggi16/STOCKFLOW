import {test} from 'node:test';
import assert from 'node:assert/strict';
import {palette,resolveTheme} from '../src/theme/palette';
function luminance(hex:string){const rgb=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('automático sigue el sistema y una preferencia explícita prevalece',()=>{assert.equal(resolveTheme('system','dark'),'dark');assert.equal(resolveTheme('system',null),'light');assert.equal(resolveTheme('light','dark'),'light');});
for(const theme of ['light','dark'] as const)test(`contraste de texto, formularios y botones: ${theme}`,()=>{const c=palette(theme);for(const [a,b] of [[c.dark,c.bg],[c.dark,c.card],[c.muted,c.card],[c.onPrimary,c.green],[c.warning,c.warningBg],[c.red,c.card]])assert.ok(contrast(a,b)>=4.5,`${a} sobre ${b}`);});
