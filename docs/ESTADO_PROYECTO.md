# Estado del proyecto — 15/10/2026

## Implementado

Se conservó y amplió el backend original, reorganizado en `stockflow/backend`, con frontend en `stockflow/mobile`. No se borraron los datos existentes.

- Autenticación JWT, rotación de refresh, logout, permisos actuales y revocación al cambiar cuenta.
- CRUD MySQL de productos, categorías y proveedores con bajas lógicas, validación y paginación.
- Movimientos de stock atómicos con auditoría, bloqueo de fila y prevención de stock negativo.
- Administración de usuarios, perfil, protección del último administrador y reportes SQL.
- Verificación de correo, recuperación y segundo factor por SMTP; códigos con vencimiento, límite de intentos y consumo único.
- Flujos Google/GitHub/Facebook preparados, sin vincular cuentas automáticamente por email.
- App Expo con formularios, búsqueda, filtros, dashboard, reportes, roles y sesión mediante SecureStore en Android. La vista web conserva tokens solo en memoria.
- Documentación de instalación, API, usuario, arquitectura y defensa escolar.

La revisión final corrigió una carrera: el login vuelve a consultar el segundo factor bajo bloqueo después de comparar la contraseña. Los cambios de permisos o configuración del segundo factor invalidan también los códigos pendientes.

## Evidencia local

| Comprobación | Resultado |
|---|---|
| TypeScript backend y móvil | Pasó |
| Build backend | Pasó |
| Pruebas unitarias backend | 3/3 |
| Integración contra MySQL real y SMTP local | 15/15 (13 escenarios y 2 pruebas contenedoras) |
| Pruebas de sesión móvil | 3/3 |
| Lint móvil | Sin errores |
| E2E web, anchos 390 y 1100 px | Pasó |
| Expo Doctor | 21/21 |
| Exportación Android/Hermes | Pasó |
| Prebuild Android | Pasó; genera proyecto nativo, no compila APK |

Las pruebas de integración crean bases temporales `stockflow_test_*` y las eliminan al terminar. Cubren JWT, roles, refresh simultáneo y reutilizado, bajas, referencias, salidas concurrentes, rollback de auditoría, códigos, recuperación, MFA, administración y reportes. OAuth se prueba sin credenciales mediante el bloqueo de configuración y el canje de tickets con prueba de posesión; no equivale a probar los proveedores reales.

Para repetir: `npm run typecheck`, `npm test`, `npm run test:integration` desde la raíz. En `mobile`: `npm run lint`, `npx expo-doctor`, `npm run export:android`.

La prueba web usa Playwright, Chromium, MySQL y backend temporal en 3001. Iniciar Metro con `EXPO_PUBLIC_API_URL=http://127.0.0.1:3001/api npx expo start --web --port 8081` y ejecutar `npm run test:e2e` desde `mobile`. Comprueba ingreso, validación, creación de categoría/producto, búsqueda sin resultados, edición, entrada de stock, reportes y salida. Capturas: [dashboard móvil](dashboard-mobile.png) y [reportes escritorio](reportes-desktop.png). La prueba web no sustituye la prueba Android nativa.

## Pendientes externos y límites

El usuario indicó que todavía no tiene configurados SMTP ni aplicaciones OAuth y pidió instrucciones. Están en [Instalación](INSTALACION.md).

- Falta probar entrega de correo real y autenticación real Google/GitHub/Facebook.
- EAS CLI detectó una sesión iniciada, pero este proyecto todavía no tiene proyecto EAS asociado. No se creó uno ni se solicitó una compilación remota.
- **No se generó un APK.** Están preparados los perfiles EAS y la configuración Android; exportar JavaScript y generar archivos nativos no produce un instalador.
- No hay Java/Android SDK ni dispositivo o emulador configurado para compilar y probar localmente.
- Falta backend público HTTPS y configuración de su URL para una entrega instalable. No se contrató hosting ni se desplegó externamente.
- No se probó carga productiva ni se configuraron respaldos externos.

## Dependencias y seguridad

El audit de dependencias de ejecución del backend reportó 0 vulnerabilidades. El audit móvil reportó 18 entradas altas derivadas de dos avisos transitivos: `braces` (GHSA-vfj7-8cjw-p6xm) y `node-forge` (GHSA-86w9-cpqp-85rv), presentes en herramientas del ecosistema Expo. Al revisar el registro no había versiones corregidas disponibles. No se aplicó `audit fix --force`, que proponía retroceder de SDK. Requieren seguimiento y reevaluación antes de producción; estas pruebas no certifican ausencia de otras vulnerabilidades.

Git excluye `.env`, dependencias, claves de firma, builds y carpetas nativas generadas. El repositorio es local, sin publicación remota.
