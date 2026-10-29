# API StockFlow

Base: `http://localhost:3000/api` en desarrollo; HTTPS en despliegues. JSON y encabezado `Authorization: Bearer ACCESS_TOKEN` para rutas privadas.

Inventario, movimientos, dashboard, reportes y demo exigen además `X-Business-Id: ID`. El servidor consulta la membresía activa y su rol en MySQL. El header identifica el contexto; no concede acceso. Los recursos ajenos devuelven 404 y una membresía inexistente/inactiva, 403. No se envía `negocio_id` en cuerpos de inventario.

Éxito: `{ "success": true, "data": ... }`. Error: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": [] } }`. `details` aparece para validación Zod. Sin stack ni secretos. Fechas en UTC; IDs BIGINT de movimientos se devuelven como texto. Los importes DECIMAL también se devuelven como texto.

## Autenticación y perfil

| Método | Ruta | Permiso | Cuerpo / resultado |
|---|---|---|---|
| GET | `/health` | Público | 200, proceso HTTP disponible |
| POST | `/auth/register` | Público | `{nombre,email,password}`; 201, sesión e identidad sin rol global |
| POST | `/auth/login` | Público | `{email,password}`; 200, sesión o desafío 2FA |
| POST | `/auth/refresh` | Refresh válido | `{refreshToken}`; 200, nuevo par de tokens |
| POST | `/auth/logout` | Refresh firmado vigente | `{refreshToken}`; 200, mensaje de cierre |
| GET | `/auth/me` | Autenticado | 200, usuario actual |
| PATCH | `/auth/me` | Autenticado | `{nombre}`; 200, perfil actualizado |
| POST | `/auth/resend-verification` | Público | `{email}`; 200, `{challengeId,message}` |
| POST | `/auth/verify-email` | Código email | `{challengeId,code}`; 200, mensaje |
| POST | `/auth/forgot-password` | Público | `{email}`; 200, `{challengeId,message}` |
| POST | `/auth/reset-password` | Código reset | `{challengeId,code,password}`; 200, mensaje |
| POST | `/auth/mfa/request` | Autenticado, email verificado | `{enabled:true}` (o false); 200, desafío de configuración |
| POST | `/auth/mfa/configure` | Autenticado, código de configuración | `{challengeId,code,enabled}`; 200, mensaje; revoca sesiones |
| POST | `/auth/mfa/verify` | Código del login | `{challengeId,code}`; 200, sesión |

Ejemplo de registro:

```json
{"nombre":"Ana Ejemplo","email":"ana@example.com","password":"ClaveSegura123"}
```

Ejemplo de sesión (valores ilustrativos, no tokens utilizables):

```json
{"success":true,"data":{"user":{"id":1,"nombre":"Ana Ejemplo","email":"ana@example.com","email_verificado":false,"segundo_factor":false},"accessToken":"JWT_ACCESS","refreshToken":"JWT_REFRESH","tokenType":"Bearer","expiresIn":900}}
```

Si hay segundo factor, login devuelve `{ "requiresMfa": true, "challengeId": "UUID", "message": "..." }` sin tokens. `code` es texto de seis dígitos. Reenvíos en menos de 60 segundos pueden devolver un desafío genérico sin enviar otro correo; conservar el último correo válido o esperar y reenviar. El identificador de desafío se mantiene en la pantalla que pidió el envío. Los códigos vencen en 10 minutos y admiten cinco errores.

La contraseña requiere 10 caracteres, mayúscula, minúscula, número y máximo 72 bytes UTF-8. Email se normaliza a minúsculas. Nombre de usuario: 2–100 caracteres. Registro no acepta `rol`, `activo` ni otros campos. El perfil solo permite editar nombre; cambiar email no está habilitado.

Access: 15 minutos. Refresh: 7 días, rotativo. Reutilizar un refresh revocado cierra todos los refresh activos de la cuenta. Dos renovaciones simultáneas del mismo token producen una respuesta correcta y otra 401, revocando también el token recién emitido. El cliente debe compartir una renovación. Logout ordinario revoca el refresh, pero access puede durar hasta su vencimiento. Reset de contraseña y configuración 2FA invalidan access mediante `token_version`.

Las rutas de negocio y las demostraciones `/demo/empleado`, `/demo/encargado`, `/demo/admin` requieren correo verificado, membresía activa y el rol correspondiente en el negocio. Cambiar membresías no revoca sesiones globales: el JWT sigue identificando la misma cuenta y los permisos se consultan por negocio.

## Social

| Método | Ruta | Cuerpo / resultado |
|---|---|---|
| GET | `/auth/social/providers` | 200, `{google:boolean,github:boolean,discord:boolean}` indica configuración, no certifica funcionamiento |
| POST | `/auth/social/:provider/start` | `{challenge:"SHA256_BASE64URL",platform:"web"}`; plataforma web/native; 200, `{url}` |
| GET | `/auth/social/:provider/callback` | Consulta `state`, `code` o `error`; 302 a `stockflow://oauth?ticket=...` o `?error=...` |
| POST | `/auth/social/exchange` | `{ticket,verifier}`; 200, sesión o desafío 2FA |

Proveedor: google/github/discord. Verificador: 43–128 caracteres URL seguros; challenge: SHA-256 del verificador en base64url sin relleno (43 caracteres). State se genera exclusivamente en backend y guarda la plataforma. El retorno web usa `WEB_APP_URL/oauth`; el nativo usa `stockflow://oauth`. Ticket dura 60 segundos y se consume una vez. Los tokens del proveedor nunca pasan a la app ni se guardan en SQL. Si el email coincide con una cuenta existente, el proveedor debe confirmarlo como verificado para vincular el método; si no lo verifica, el callback devuelve `ACCOUNT_EXISTS_UNVERIFIED`. Un proveedor sin configuración devuelve 503. Callback transforma errores en códigos de retorno sin trazas.

## Catálogos

| Recurso | GET lista / GET `/:id` | POST / PUT `/:id` / PATCH `/:id` | DELETE `/:id` |
|---|---|---|---|
| `/products` | Todos | Admin/encargado | Admin |
| `/categories` | Todos | Admin/encargado | Admin |
| `/suppliers` | Todos | Admin/encargado | Admin |

POST devuelve 201; GET, PUT, PATCH y DELETE devuelven 200. Todos requieren email verificado y negocio autorizado. Los IDs son enteros positivos hasta 2147483647. DELETE devuelve `message` y realiza baja lógica. No se reactivan catálogos desde API. Nombres de categorías/proveedores y SKU son únicos dentro de cada negocio, incluso tras baja. Categoría y proveedor deben pertenecer al mismo negocio del producto; también hay claves foráneas compuestas en MySQL.

Cuerpo categoría:

```json
{"nombre":"Almacén","descripcion":"Comestibles"}
```

Cuerpo proveedor:

```json
{"nombre":"Distribuidora","email":"ventas@example.com","telefono":"1122334455","direccion":"Calle 123"}
```

Cuerpo producto:

```json
{"nombre":"Yerba","sku":"YERBA-001","precio":"4500.00","stock_minimo":5,"categoria_id":1,"proveedor_id":1,"descripcion":"Paquete de 1 kg"}
```

Producto requiere nombre (150), SKU (64), precio (texto, hasta 10 enteros y 2 decimales) y categoría activa. Stock mínimo opcional, entero no negativo; al crear vale cero si se omite. Proveedor opcional, activo o null. Descripción opcional/null (1000 para producto, 500 categoría); datos de contacto opcionales/null. No se aceptan `stock`, `activo` ni campos desconocidos.

`precio` es el precio de venta por unidad. `costo_compra` es opcional/null, texto decimal no negativo con hasta 10 enteros y 2 decimales. PATCH omitido conserva el costo; null lo elimina; "0" indica costo cero conocido. Migración 006 deja costos históricos en null. Se permite vender por debajo del costo; la interfaz lo advierte. Los reportes existentes siguen valuando stock a precio de venta: no representan ganancia ni costo histórico de las compras.

PATCH requiere al menos un campo y conserva los omitidos. PUT requiere los campos obligatorios y conserva opcionales omitidos: es una actualización completa de campos obligatorios, no reemplazo destructivo.

Listas: `?page=1&limit=20&q=Yerba`; `limit` de 1 a 100. Productos admiten `categoria_id`, `proveedor_id`, `stock=disponible|bajo|sin`. `bajo` significa stock menor o igual al mínimo. `q` busca nombre y, para productos, SKU; `%` y `_` actúan como comodines LIKE parametrizados.

```json
{"success":true,"data":{"items":[{"id":1,"nombre":"Yerba","sku":"YERBA-001","precio":"4500.00","stock":0,"stock_minimo":5,"categoria_id":1,"proveedor_id":1,"activo":1}],"page":1,"limit":20,"total":1}}
```

La baja de producto exige stock cero. Categoría/proveedor no puede darse de baja si tiene productos activos asociados.

POST `/products` admite `stock_inicial` opcional, entero entre 0 y 2147483647 (por defecto 0). Solo depósito puede crearlo con un valor positivo: registra una entrada en la misma transacción. El administrador puede crear productos con stock cero. PATCH/PUT rechazan `stock_inicial`; las modificaciones posteriores usan recepción o ajuste de depósito.

## Movimientos

- `POST /stock/receive`: solo depósito; `{producto_id,cantidad,motivo}`. Devuelve 201.
- `POST /stock/ordinary-adjustment`: solo depósito; `{producto_id,cantidad,motivo}` donde cantidad es el stock final.
- `POST /movements`: ruta de compatibilidad solo para depósito; acepta `entrada` o `ajuste`, nunca `salida`.
- `GET /movements?page=1&limit=20`: historial paginado. Las salidas se generan al confirmar entregas.

```json
{"producto_id":1,"tipo":"entrada","cantidad":10,"motivo":"Compra inicial"}
```

La entrada exige entero positivo; el ajuste admite cero y significa **stock final deseado**. Motivo obligatorio de hasta 500 caracteres. Máximo stock 2147483647. Un ajuste no puede bajar del total reservado. No hay edición/borrado del historial.

## Dashboard y reportes

| GET | Permiso | Filtros / respuesta |
|---|---|---|
| `/dashboard` | Todos | Sin filtros; `{productos,unidades,unidades_reservadas,unidades_disponibles,stock_bajo,sin_stock}` y `valor` solo para responsables |
| `/reports/summary` | Admin/encargado | `categoria_id`, `producto_id`; métricas actuales con valor |
| `/reports/stock-value` | Admin/encargado | Mismos filtros; `{summary,categorias:[{id,nombre,productos,unidades,valor}]}` |
| `/reports/low-stock` | Admin/encargado | Mismos filtros más page/limit; `{items,page,limit}` |
| `/reports/movements` | Admin/encargado | `desde`, `hasta`, `categoria_id`, `producto_id`; `{periodos,productos}` |

Fecha `AAAA-MM-DD`, límites inclusivos en UTC. Máximo 366 días en movimientos; por defecto últimos 30 días. `periodos` agrupa fecha/tipo con cantidad y operaciones; `productos` contiene los diez con más operaciones. Ajustes aparecen separados: no representan unidades compradas/vendidas. Los reportes de stock reflejan el estado actual, no una reconstrucción histórica; fechas recibidas en ellos no alteran el stock actual. Historial incluye productos dados de baja; métricas actuales, solamente activos.

## Negocios, integrantes e invitaciones

JWT y email verificado en todas estas rutas. No requieren header de negocio: el ID del path se autoriza explícitamente. Los listados devuelven `{items}` y solo distribuidoras activas del usuario. Los roles son `admin`, `encargado`, `empleado` y `repartidor`; pertenecen a la membresía.

| Método | Ruta | Parámetros / cuerpo |
|---|---|---|
| POST | `/businesses` | `{nombre,rubro?,descripcion?}`; 201, negocio y rol admin del creador, transacción atómica |
| GET | `/businesses` | Negocios del usuario y rol en cada uno |
| GET | `/businesses/:id` | Información para integrantes activos |
| PATCH | `/businesses/:id` | Admin; nombre/rubro/descripción o `{activo:false}`; exige stock cero y ningún pedido abierto para desactivar |
| GET | `/businesses/:id/members` | Admin; integrantes, rol y estado, sin datos de seguridad global |
| PATCH | `/businesses/:id/members/:userId` | Admin; `{rol?,estado?:"activo"|"inactivo"}` |
| DELETE | `/businesses/:id/members/:userId` | Admin; baja de membresía, conserva historial |
| POST | `/businesses/:id/invitations` | Admin; `{email,rol}`; 201 si envío SMTP confirmado |
| GET | `/businesses/:id/invitations` | Admin; historial con estados pendiente/vencida/aceptada/cancelada |
| GET | `/invitations` | Invitaciones pendientes al correo verificado de la sesión |
| POST | `/invitations/accept` | `{token}` del correo, o `{id}` de la bandeja propia (exactamente uno) |
| POST | `/invitations/:id/resend` | Admin del negocio de la invitación; rota token, espera mínima 60 s |
| DELETE | `/invitations/:id` | Admin del negocio; cancela una invitación pendiente |

Los demás resultados correctos devuelven 200. No queda una ruta de administración global `/users`. El perfil propio se edita en `/auth/me`. Siempre se conserva un administrador activo por negocio, incluso ante cambios simultáneos. Desactivar cancela invitaciones, conserva inventario e historial y no ofrece reactivación automática.

Invitaciones: token aleatorio de 32 bytes, SHA-256 en base, 7 días de vigencia. Se acepta solo con una cuenta activa, correo verificado coincidente y negocio activo. El ID de la bandeja tampoco permite aceptar invitaciones de otro email. Aceptar dos veces falla. Un reenvío invalida el token anterior. Si SMTP falla al crear, queda pendiente sin confirmación de envío, disponible para reenvío; nunca se devuelve el token por API. El enlace usa fragmento `#token=` para evitar incluirlo en peticiones HTTP o referers.

## Distribuidoras, clientes, pedidos y entregas (migración 007)

Las rutas siguientes requieren `Authorization: Bearer ...` y `X-Business-Id` de una distribuidora donde el usuario tenga membresía activa. `negocio_id` se conserva como nombre físico de columna; nunca se acepta del cuerpo. Los roles y acciones exclusivas están en [MATRIZ_ROLES.md](MATRIZ_ROLES.md).

| Método | Ruta | Rol | Cuerpo / resultado |
|---|---|---|---|
| GET | `/clients` o `/client-ranking` | Jefe, depósito, ventas | Clientes ordenados por última evaluación ponderada; sin evaluar al final |
| POST | `/clients` | Ventas | `{nombre_comercial,contacto?,email?,telefono?,direccion_entrega,observaciones?}` |
| PATCH | `/clients/:id` | Jefe, ventas | Campos parciales; `activo` permite baja lógica |
| GET | `/clients/:id/history` | Jefe, depósito, ventas | Pedidos y evaluaciones |
| POST | `/clients/:id/ratings` | Jefe, depósito | `{puntualidad,acuerdos,trato,motivo}`; criterios 1–5 |
| GET | `/orders` | Todos | Repartidor ve solo asignados |
| POST | `/orders` | Ventas | `{cliente_id,observaciones?,items:[{producto_id,cantidad},...]}`; precio del producto se copia en el detalle |
| GET | `/orders/:id` | Todos | Detalles e historial; repartidor solo asignados |
| POST | `/orders/:id/approve-preparation` | Depósito | Reserva stock; pendiente → en preparación |
| POST | `/orders/:id/ready` | Depósito | En preparación → preparado |
| POST | `/orders/:id/reject-preparation` | Depósito | `{motivo}`; libera reservas, cancela |
| GET | `/drivers` | Jefe, depósito | Repartidores activos para asignación |
| POST | `/orders/:id/assign` | Jefe, depósito | `{repartidor_id}` activo de esta distribuidora |
| GET | `/deliveries` | Repartidor | Solo entregas asignadas |
| POST | `/orders/:id/pickup` | Repartidor asignado | Preparado → en reparto |
| POST | `/orders/:id/delivered` | Repartidor asignado | Descuenta stock y consume reservas una sola vez |
| POST | `/orders/:id/delivery-failed` | Repartidor asignado | `{motivo}`; conserva reservas para reintento |
| POST | `/orders/:id/cancel` | Jefe, ventas (propio) | `{motivo}`; libera reservas |
| POST | `/orders/:id/return` | Jefe, depósito | `{motivo}`; devolución completa, repone stock una vez |
| POST | `/orders/:id/payment-notice` | Ventas | Registra aviso, **no confirma pago** |
| GET/POST | `/stock/adjustment-requests` | GET jefe/depósito/ventas; POST depósito/ventas | POST `{producto_id,stock_propuesto,motivo}` |
| POST | `/stock/adjustment-requests/:id/approve` o `/reject` | Jefe | `{motivo}`; aprobación ajusta stock si respeta reservas |

Por ejemplo, un pedido de 7 aguas a $12,50 y 2 jugos a $5,00 guarda total $97,50. Aprobarlo reserva 7 y 2 unidades sin descontar stock físico; entregarlo crea dos salidas auditadas. Repetir la confirmación devuelve 409. Las transacciones y la clave única de movimientos impiden duplicar la salida.

## Códigos de error

| HTTP | Códigos frecuentes |
|---|---|
| 400 | BAD_JSON, BUSINESS_REQUIRED |
| 401 | MISSING_TOKEN, INVALID_TOKEN, INVALID_SESSION, INVALID_USER, BAD_CREDENTIALS, INVALID_CODE, INVALID_STATE, INVALID_TICKET, OAUTH_FAILED |
| 403 | FORBIDDEN, EMAIL_NOT_VERIFIED, BUSINESS_FORBIDDEN, INVITATION_EMAIL_MISMATCH |
| 404 | NOT_FOUND |
| 409 | EMAIL_EXISTS, CONFLICT, IN_USE, NONZERO_STOCK, INSUFFICIENT_STOCK, STOCK_OVERFLOW, INVALID_REFERENCE, SELF_ADMIN_CHANGE, LAST_ADMIN, ACCOUNT_EXISTS |
| 413 | PAYLOAD_TOO_LARGE (32 KB) |
| 422 | VALIDATION_ERROR |
| 429 | RATE_LIMIT |
| 500 | INTERNAL_ERROR |
| 503 | MAIL_NOT_CONFIGURED, MAIL_UNAVAILABLE, OAUTH_NOT_CONFIGURED |

Registro/login/refresh/códigos comparten un límite de 20 solicitudes por IP en 15 minutos. Social admite 30 por 15 minutos. Para producción con múltiples instancias se debe usar rate limiting compartido.


## Catálogo especializado (28/10/2026)
`GET /api/products?size=chica&type=reforzada&search=CAJA&page=1&limit=20`: size admite chica/mediana/grande; type admite estandar/reforzada; búsqueda por nombre o SKU. limit máximo 100. Valores desconocidos: 422. Se mantienen q/categoria_id/proveedor_id/stock para compatibilidad con clientes anteriores, sin exponerlos como filtros del nuevo catálogo.

POST/PATCH de productos aceptan size, type, dimensiones (150 caracteres) e imagen_url HTTPS. El formulario exige tamaño y tipo; la API permite omitirlos por compatibilidad histórica. categoria_id es opcional: al crear se resuelve la categoría interna Cajas de cartón en la distribuidora activa. Stock no es editable con PATCH. stock_inicial solo al crear, auditado y restringido a encargado cuando es positivo.

`GET /api/dashboard` conserva métricas de inventario y agrega pedidos_pendientes, entregas_pendientes, pedidos_entregados, para_preparar, pagos_informados, ultimos_pedidos y mas_distribuidos. Admin/encargado reciben stock_bajo_productos y movimientos_recientes. Repartidor recibe solo agregados de sus asignaciones. Empleado recibe agregados de sus propios pedidos. Todas las consultas filtran negocio_id.

Clientes aceptan localidad, provincia, latitud (-90..90) y longitud (-180..180). Coordenadas deben enviarse juntas o ambas null. Modificar dirección sin coordenadas las invalida. `/deliveries` y detalle de pedido incluyen dirección y coordenadas; conservan el control de repartidor asignado.

`POST /api/geocode {"address":"dirección, localidad, provincia"}`: admin/empleado; máximo 10 consultas/minuto por IP; devuelve hasta cinco candidatos con latitud,longitud,direccion. No guarda automáticamente. 503 sin proveedor configurado, 502 ante fallo externo. El endpoint del proveedor y la clave son privados del backend.

OAuth Facebook: `/api/auth/social/facebook/...`, mismo flujo de state, ticket y prueba de posesión que los proveedores existentes. El correo se verifica por StockFlow; no se vincula silenciosamente una cuenta existente sin verificación del proveedor.
