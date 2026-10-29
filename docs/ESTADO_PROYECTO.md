# Estado vigente — cajas de cartón — 29/10/2026

Actualización de valores: Más → Valores de cajas permite a admin/encargado configurar nombres y opciones por distribuidora, con Forma incluida y características adicionales. Productos conservan valores históricos y medidas editables. «Alertar poco stock» configura el umbral visual inclusivo por producto (stock <= unidades). Migración 010 aplicada a la base configurada. Probado por HTTP/SQL: guardado, aislamiento y rechazo de edición para empleados.

## Implementado
Catálogo de cajas con tamaño/tipo y búsqueda por nombre/SKU; campos descriptivos e imagen opcional; seed idempotente de 12 cajas con movimientos auditados. Temas Claro/Oscuro/Automático persistidos, paleta central y componentes reactivos. Dashboard SQL por rol y cuatro pestañas con Más. Mapa Android/web Leaflet/OpenStreetMap sin clave con marcadores de entregas asignadas, ubicación foreground, Google Maps y acciones reutilizadas del pedido. Clientes con localidad/provincia/coordenadas y geocodificación configurable. Facebook restaurado conservando Discord en backend y las identidades históricas.

Se preservaron autenticación, invitaciones, ranking, reservas, auditoría, aislamiento y las tres acciones exclusivas por rol. No se descartaron los cambios locales que ya existían al iniciar.

## Evidencia ejecutada
- TypeScript backend y frontend: sin errores.
- Build backend: correcto.
- Unitarias backend: 5/5; frontend: 9/9, incluyendo contraste de texto y botones y resolución del tema automático.
- Integración SQL/HTTP/SMTP: 34/34 (incluye las pruebas contenedoras). Se ejecutaron en bases temporales sobre MariaDB de XAMPP compatible con MySQL; no se presentan como un ensayo completo contra el servidor MySQL remoto.
- Incluyen permisos positivos/negativos, aislamiento, reservas, doble entrega concurrente, rollback al fallar auditoría, filtros, dashboard, coordenadas y seed ejecutado dos veces sin sobrescribir datos.
- Facebook y geocodificación: proveedor externo simulado en tests, no consentimiento real ni consulta geográfica real.
- Recorrido Expo web + API + base temporal: cliente, pedido de dos productos, preparación, asignación, retiro, entrega, stock final, cuatro pestañas, Más/Perfil, filtro de tamaño y tema oscuro. Correcto. Capturas carton-*.png guardadas y revisadas.
- Export Android/Hermes ejecutado correctamente. No equivale a APK instalada.
- Introspección Expo previa: Location configurado; solo permisos de ubicación foreground e Internet; ubicación background bloqueada.

## Base configurada
Se revisó el esquema remoto. La estructura de 005 estaba presente pero faltaba su registro en schema_migrations. Se verificaron columnas, índices únicos y relaciones compuestas antes de conciliar ese registro, sin ejecutar de nuevo sus UPDATE históricos. Se creó una copia local de estructura/datos en `.local-backups/before-carton-1793227735202.json` (ignorada por Git, contiene datos privados). Después se aplicó 009_carton.sql correctamente. No se cargaron productos ficticios en una distribuidora real: el seed está disponible y fue verificado sobre datos de prueba.

## Pendiente externo
- Backend configurado: https://stockflow-api-renzo.onrender.com/api. Mapa reemplazado por Leaflet/OpenStreetMap sin clave; ver CONFIGURAR_APK.md.
- Build EAS solicitado el 29/10: d4e1a01e-9de6-4aa7-a45c-bd7aca0a1e5f. Firma Android creada en EAS. Pendientes resultado de compilación e instalación/pruebas en Android físico.
- Render /api/health no respondió en tres intentos de 20 a 55 segundos desde este equipo. No se confirmó disponibilidad remota ni login.
- Mapa probado con Chromium: tiles reales de OpenStreetMap, selección y popup con texto seguro. Export Android, TypeScript y lint correctos tras el reemplazo.
- GEOCODING_URL de un proveedor autorizado compatible con Nominatim si se desea buscar coordenadas; la edición manual y navegación por dirección quedan disponibles.
- Configuración y consentimiento real de Facebook, y validación externa de los demás proveedores y correo.
- El entorno heredado desactiva verificación TLS; antes de despliegue, configurar CA y verificación de certificados.

## Decisiones de compatibilidad
La API mantiene filtros antiguos y clasificación opcional para clientes históricos, aunque el formulario nuevo exige tamaño/tipo y solo expone esos filtros. Los productos anteriores no reciben clasificaciones inventadas. Categorías/proveedores se mantienen en SQL; la ruta antigua Categorías redirige al catálogo.

No existe un módulo de recepciones planificadas: una recepción se registra cuando ingresan cajas. Por eso no se muestra una cifra ficticia de “recepciones pendientes”.

## Historial anterior (no describe el estado vigente)

# Estado del proyecto — 21/10/2026

## Actualización: distribuidoras

La migración 007 se aplicó a la base local tras una copia previa en `/Users/renzo/Downloads/stockflow-pre-distribuidora-2026-10-21.sql`, con permisos de propietario y fuera del repositorio. Se conservan los datos existentes. La API incorpora clientes, pedidos multiproducto, reservas, entregas, devoluciones, ranking y ajustes extraordinarios. Los cuatro roles tienen acciones exclusivas protegidas por middleware y por verificación transaccional. La app Expo incorpora Clientes, Pedidos, Entregas y Ajustes; las pestañas cambian según rol. Ver [matriz](MATRIZ_ROLES.md).

Validación del 21/10: backend compiló; 3 pruebas unitarias y 31 pruebas de integración MySQL/SMTP pasaron. Móvil pasó TypeScript, lint, 4 pruebas de sesión/contexto y exportación Android/Hermes. El recorrido web de Expo contra API y MySQL temporales pasó: ventas creó cliente y pedido con dos productos; depósito reservó, preparó y asignó; repartidor confirmó retiro y entrega. Se corrigió un modal que retenía el foco después de cerrarse. La API local responde en 3000 y Expo web en 8081.

Proyecto EAS vinculado a [@renzomaggi/stockflow-estanga](https://expo.dev/accounts/renzomaggi/projects/stockflow-estanga). **Aún no existe APK**: no hay una API HTTPS pública configurada para insertar en el build. `render.yaml` prepara el servicio de Render, pero debe conectarse una cuenta de hosting y la base MySQL remota. Tampoco hay prueba en el Android físico. El bloque de abajo conserva evidencia histórica de etapas anteriores.

## Estado vigente: multinegocio

Implementados creación, selección y configuración de negocios; membresías con roles independientes; equipo e invitaciones por SMTP con hash, vencimiento y aceptación mediante email verificado. Inventario y reportes están aislados mediante consultas y referencias SQL compuestas. El cambio de negocio limpia datos y descarta respuestas tardías. Se conservan JWT, refresh y MFA.

La migración 005 se aplicó con backup local: conserva 3 cuentas, 2 productos y 1 movimiento. Los datos anteriores quedan en un negocio histórico inactivo sin propietario. Al entrar, crear el negocio propio desde la app. Ver [Multinegocio](MULTINEGOCIO.md) para modelo, migración y pruebas.

Validación actual: build y TypeScript backend/móvil, lint, 3 pruebas unitarias backend, 25 integraciones MySQL/SMTP (22 escenarios y 3 contenedoras), 4 pruebas móviles de sesión/contexto, E2E con dos cuentas e inventarios separados, OAuth web simulado de Google/GitHub/Discord y exportación Android/Hermes. Todas pasaron. El error de auditoría de una integración es provocado para comprobar rollback.

### Checklist pendiente de entrega externa

- [x] Correo real de registro recibido y confirmado por el usuario.
- [x] Credenciales SMTP y OAuth integradas en entorno local ignorado por Git.
- [x] Flujo multinegocio e invitaciones probado con SMTP local, sin envíos externos.
- [ ] Probar invitación real con destinatario elegido y enlace públicamente accesible.
- [ ] Completar consentimiento y retorno real de Google/GitHub/Discord en web y Android.
- [ ] Completar certificado CA de Aiven; MySQL local sigue activo.
- [ ] Desplegar backend HTTPS y configurar frontend, CORS y callbacks públicos; Render pendiente.
- [x] Asociar proyecto EAS.
- [ ] Generar APK contra API HTTPS pública y probarlo en Android físico. Exportar Hermes no produce APK.
- [ ] Revisar avisos de dependencias, rendimiento y respaldos externos antes de producción.

Para E2E iniciar Metro en 8082 con API de prueba 3001; ejecutar desde mobile `TEST_WEB_URL=http://localhost:8082 npm run test:e2e` y luego `npm run test:oauth:web`.

## Historial de revisión — 15/10/2026

Las secciones siguientes registran el estado anterior. Los conteos de pruebas, administración global y bloqueo SMTP que mencionan fueron reemplazados por el estado vigente descrito arriba. Facebook fue sustituido por Discord.

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
| Integración contra MySQL real y SMTP local | 16/16 (14 escenarios y 2 pruebas contenedoras) |
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

## Integración de credenciales suministradas

Credenciales SMTP, Google, GitHub y Discord guardadas únicamente en `.env` local (ignorado por Git). Aiven está separado en `.env.aiven`, sin sustituir MySQL local. No se copiaron secretos a documentación.

Discord reemplaza Facebook en la API y la pantalla; migración 003 amplía los ENUM conservando las identidades históricas. El flujo Discord tiene prueba automatizada con respuestas simuladas del proveedor; queda pendiente comprobar consentimiento y retorno en Android real. Google/GitHub también requieren esa validación externa.

Brevo rechazó la comprobación SMTP con `525 5.7.1 Unauthorized IP address`: autorizar la actividad/IP en Brevo antes de repetir. No se envió correo. Aiven falló la validación TLS (`HANDSHAKE_SSL_ERROR`); descargar su certificado CA y configurar `DB_SSL_CA_FILE`. No se deshabilitó la validación de certificados. Render sigue pendiente.

## Dashboard, acceso y OAuth web

Se agregó retorno web OAuth con `WEB_APP_URL` fijo del servidor y plataforma persistida en el state; la URL de retorno no se acepta libremente del cliente. La app conserva solo el verificador temporal en sessionStorage, lo consume al volver y mantiene los tokens de sesión web en memoria. La migración 004 conserva el retorno nativo por defecto.

Google, GitHub y Discord aparecen tanto en ingreso como en registro. Se probaron los tres retornos web con proveedor simulado, MFA, consumo único y cuenta existente (`npm run test:oauth:web`, con Metro de pruebas). Google, GitHub y Discord reales llegaron a su pantalla de ingreso. No se afirma que haya habido consentimiento real ni canje real de esos proveedores. Una cuenta existente por contraseña sigue requiriendo su método original; no se enlazan identidades automáticamente.

Dashboard rediseñado: indicadores navegables a filtros de productos, actualización manual, salud de stock, alertas de reposición, historial reciente y acciones según rol. Ingreso/registro tienen composición adaptable, botones sociales y visibilidad de contraseña. E2E de inventario pasó a 390 y 1100 px, lint/TypeScript e integración 16/16. Se exportó Android; no equivale a un APK ni prueba nativa.

El usuario confirmó recepción de correo y registro: el bloqueo inicial SMTP quedó superado.
