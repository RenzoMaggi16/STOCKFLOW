# API StockFlow

Base: `http://localhost:3000/api` en desarrollo; HTTPS en despliegues. JSON y encabezado `Authorization: Bearer ACCESS_TOKEN` para rutas privadas.

Éxito: `{ "success": true, "data": ... }`. Error: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos", "details": [] } }`. `details` aparece para validación Zod. Sin stack ni secretos. Fechas en UTC; IDs BIGINT de movimientos se devuelven como texto. Los importes DECIMAL también se devuelven como texto.

## Autenticación y perfil

| Método | Ruta | Permiso | Cuerpo / resultado |
|---|---|---|---|
| GET | `/health` | Público | 200, proceso HTTP disponible |
| POST | `/auth/register` | Público | `{nombre,email,password}`; 201, sesión y usuario empleado |
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
{"success":true,"data":{"user":{"id":1,"nombre":"Ana Ejemplo","email":"ana@example.com","rol":"empleado","email_verificado":false,"segundo_factor":false},"accessToken":"JWT_ACCESS","refreshToken":"JWT_REFRESH","tokenType":"Bearer","expiresIn":900}}
```

Si hay segundo factor, login devuelve `{ "requiresMfa": true, "challengeId": "UUID", "message": "..." }` sin tokens. `code` es texto de seis dígitos. Reenvíos en menos de 60 segundos pueden devolver un desafío genérico sin enviar otro correo; conservar el último correo válido o esperar y reenviar. El identificador de desafío se mantiene en la pantalla que pidió el envío. Los códigos vencen en 10 minutos y admiten cinco errores.

La contraseña requiere 10 caracteres, mayúscula, minúscula, número y máximo 72 bytes UTF-8. Email se normaliza a minúsculas. Nombre de usuario: 2–100 caracteres. Registro no acepta `rol`, `activo` ni otros campos. El perfil solo permite editar nombre; cambiar email no está habilitado.

Access: 15 minutos. Refresh: 7 días, rotativo. Reutilizar un refresh revocado cierra todos los refresh activos de la cuenta. Dos renovaciones simultáneas del mismo token producen una respuesta correcta y otra 401, revocando también el token recién emitido. El cliente debe compartir una renovación. Logout ordinario revoca el refresh, pero access puede durar hasta su vencimiento. Cambios administrativos, reset de contraseña y configuración 2FA invalidan access mediante `token_version`.

Las rutas de negocio requieren correo verificado. Las rutas de demostración `/demo/empleado`, `/demo/encargado`, `/demo/admin` requieren JWT y los roles correspondientes, pero no son rutas de negocio.

## Social

| Método | Ruta | Cuerpo / resultado |
|---|---|---|
| GET | `/auth/social/providers` | 200, `{google:boolean,github:boolean,facebook:boolean}` indica configuración, no certifica funcionamiento |
| POST | `/auth/social/:provider/start` | `{challenge:"SHA256_BASE64URL"}`; 200, `{url}` |
| GET | `/auth/social/:provider/callback` | Consulta `state`, `code` o `error`; 302 a `stockflow://oauth?ticket=...` o `?error=...` |
| POST | `/auth/social/exchange` | `{ticket,verifier}`; 200, sesión o desafío 2FA |

Proveedor: google/github/facebook. Verificador: 43–128 caracteres URL seguros; challenge: SHA-256 del verificador en base64url sin relleno (43 caracteres). State se genera exclusivamente en backend. Ticket dura 60 segundos y se consume una vez. Los tokens del proveedor nunca pasan a la app ni se guardan en SQL. No hay vinculación automática de cuentas por email; coincidencias con otro método dan `ACCOUNT_EXISTS`. Un proveedor sin configuración devuelve 503. Callback transforma errores en códigos de retorno sin trazas.

## Catálogos

| Recurso | GET lista / GET `/:id` | POST / PUT `/:id` / PATCH `/:id` | DELETE `/:id` |
|---|---|---|---|
| `/products` | Todos | Admin/encargado | Admin |
| `/categories` | Todos | Admin/encargado | Admin |
| `/suppliers` | Todos | Admin/encargado | Admin |

POST devuelve 201; GET, PUT, PATCH y DELETE devuelven 200. Todos requieren email verificado. Los IDs son enteros positivos hasta 2147483647. DELETE devuelve `message` y realiza baja lógica. No se reactivan catálogos desde API. Nombres de categorías/proveedores y SKU son únicos, incluso tras baja.

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

PATCH requiere al menos un campo y conserva los omitidos. PUT requiere los campos obligatorios y conserva opcionales omitidos: es una actualización completa de campos obligatorios, no reemplazo destructivo.

Listas: `?page=1&limit=20&q=Yerba`; `limit` de 1 a 100. Productos admiten `categoria_id`, `proveedor_id`, `stock=disponible|bajo|sin`. `bajo` significa stock menor o igual al mínimo. `q` busca nombre y, para productos, SKU; `%` y `_` actúan como comodines LIKE parametrizados.

```json
{"success":true,"data":{"items":[{"id":1,"nombre":"Yerba","sku":"YERBA-001","precio":"4500.00","stock":0,"stock_minimo":5,"categoria_id":1,"proveedor_id":1,"activo":1}],"page":1,"limit":20,"total":1}}
```

La baja de producto exige stock cero. Categoría/proveedor no puede darse de baja si tiene productos activos asociados.

## Movimientos

- `POST /movements`: todos pueden entrada/salida; ajuste solo admin/encargado. Devuelve 201.
- `GET /movements?page=1&limit=20`: admin/encargado ven todos; empleado, solo los propios. Devuelve lista paginada, nombres de producto y responsable.

```json
{"producto_id":1,"tipo":"entrada","cantidad":10,"motivo":"Compra inicial"}
```

Entrada/salida exige entero positivo; ajuste admite cero y significa **stock final deseado**. Motivo obligatorio de hasta 500 caracteres. Máximo stock 2147483647. Devuelve movimiento con `id`, `producto_id`, `usuario_id`, `tipo`, `cantidad`, `stock_anterior`, `stock_nuevo`, `motivo`, `creado_en`. No hay edición/borrado del historial.

## Dashboard y reportes

| GET | Permiso | Filtros / respuesta |
|---|---|---|
| `/dashboard` | Todos | Sin filtros; `{productos,unidades,stock_bajo,sin_stock}` y `valor` solo para responsables |
| `/reports/summary` | Admin/encargado | `categoria_id`, `producto_id`; métricas actuales con valor |
| `/reports/stock-value` | Admin/encargado | Mismos filtros; `{summary,categorias:[{id,nombre,productos,unidades,valor}]}` |
| `/reports/low-stock` | Admin/encargado | Mismos filtros más page/limit; `{items,page,limit}` |
| `/reports/movements` | Admin/encargado | `desde`, `hasta`, `categoria_id`, `producto_id`; `{periodos,productos}` |

Fecha `AAAA-MM-DD`, límites inclusivos en UTC. Máximo 366 días en movimientos; por defecto últimos 30 días. `periodos` agrupa fecha/tipo con cantidad y operaciones; `productos` contiene los diez con más operaciones. Ajustes aparecen separados: no representan unidades compradas/vendidas. Los reportes de stock reflejan el estado actual, no una reconstrucción histórica; fechas recibidas en ellos no alteran el stock actual. Historial incluye productos dados de baja; métricas actuales, solamente activos.

## Administración de usuarios

Solo admin con email verificado. Nunca expone password_hash, secretos ni hashes de códigos.

| Método | Ruta | Parámetros / cuerpo |
|---|---|---|
| GET | `/users` | `q` nombre/email, `rol=admin|encargado|empleado`, page/limit; lista paginada |
| GET | `/users/:id` | Detalle público, activo, verificación, segundo factor y creación |
| PATCH | `/users/:id` | `{nombre}` |
| PATCH | `/users/:id/role` | `{rol:"encargado"}` |
| PATCH | `/users/:id/status` | `{activo:false}` |

Todas devuelven 200. No permite autoexclusión del administrador; bloquea operaciones que dejen al sistema sin administrador activo. Cambiar rol/estado revoca sesiones y requiere nuevo login del usuario afectado.

## Códigos de error

| HTTP | Códigos frecuentes |
|---|---|
| 400 | BAD_JSON |
| 401 | MISSING_TOKEN, INVALID_TOKEN, INVALID_SESSION, INVALID_USER, BAD_CREDENTIALS, INVALID_CODE, INVALID_STATE, INVALID_TICKET, OAUTH_FAILED |
| 403 | FORBIDDEN, EMAIL_NOT_VERIFIED |
| 404 | NOT_FOUND |
| 409 | EMAIL_EXISTS, CONFLICT, IN_USE, NONZERO_STOCK, INSUFFICIENT_STOCK, STOCK_OVERFLOW, INVALID_REFERENCE, SELF_ADMIN_CHANGE, LAST_ADMIN, ACCOUNT_EXISTS |
| 413 | PAYLOAD_TOO_LARGE (32 KB) |
| 422 | VALIDATION_ERROR |
| 429 | RATE_LIMIT |
| 500 | INTERNAL_ERROR |
| 503 | MAIL_NOT_CONFIGURED, MAIL_UNAVAILABLE, OAUTH_NOT_CONFIGURED |

Registro/login/refresh/códigos comparten un límite de 20 solicitudes por IP en 15 minutos. Social admite 30 por 15 minutos. Para producción con múltiples instancias se debe usar rate limiting compartido.
