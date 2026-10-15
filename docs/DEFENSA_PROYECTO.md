# Defensa del proyecto StockFlow

## Presentación de dos minutos

StockFlow organiza el inventario de un comercio. Permite saber qué productos existen, cuántas unidades quedan y quién modificó cada cantidad. La app Android habla con una API; la API valida permisos y guarda los datos en MySQL. Separamos administrador, encargado y empleado para que cada persona tenga las herramientas necesarias. Cada movimiento queda registrado y una transacción evita inconsistencias aunque dos personas trabajen a la vez.

## Preguntas y respuestas

**¿Qué problema resuelve?** Reduce errores de planillas separadas, stock desactualizado y falta de trazabilidad. Las alertas ayudan a detectar reposición y el historial permite explicar cambios.

**¿Por qué React Native y Expo?** Permiten crear pantallas con TypeScript y componentes móviles reutilizables. Expo integra navegación, almacenamiento seguro y el proceso de compilación Android. La vista web sirve para parte de las pruebas, pero no reemplaza probar un APK.

**¿Cómo se comunica la app con la API?** Axios envía solicitudes HTTP con JSON y un Bearer token. Por ejemplo, listar productos es GET; crear es POST; editar parcialmente es PATCH. La API devuelve datos o errores con códigos HTTP.

**¿Qué es REST?** Una forma de organizar recursos y acciones HTTP. Productos, usuarios y movimientos tienen rutas estables; cada método comunica la operación solicitada.

**¿Qué es JWT?** Un token firmado que acredita una identidad y contiene vencimiento, emisor y audiencia. No es una contraseña ni cifrado de todos sus datos. La firma impide modificarlo sin detección. No ponemos secretos dentro del payload.

**¿Para qué sirve el refresh?** Permite obtener otro access token sin volver a escribir contraseña. Dura más, se guarda de forma segura en el teléfono y su hash queda en la base. Se rota y revoca para limitar su reutilización.

**¿Cómo guardan las contraseñas?** Con bcrypt y factor de costo 12. Guardamos un hash, no una contraseña recuperable. El máximo de 72 bytes se valida para evitar el truncamiento de bcrypt.

**¿Qué hace un middleware?** Intercepta una solicitud antes de la operación. En StockFlow valida JWT, usuario activo, versión de sesión, correo verificado y rol. Otro middleware uniforma errores sin enviar trazas al cliente.

**¿Cómo funcionan los roles?** El registro público solo crea empleados. El administrador gestiona usuarios y bajas; el encargado crea y edita inventario y consulta reportes; el empleado consulta y registra entradas/salidas. El rol se vuelve a leer en MySQL, no se confía en campos enviados por la app.

**¿Cómo evitan stock negativo?** La API bloquea la fila del producto, calcula el nuevo stock y rechaza una salida excesiva. MySQL también tiene una restricción CHECK. Una prueba envía dos salidas simultáneas y verifica que solo una pueda consumir las unidades disponibles.

**¿Qué es una transacción?** Un grupo de cambios que se guarda completo o se revierte. Actualizar el producto e insertar la auditoría deben ocurrir juntos. La prueba de rollback provoca un fallo al insertar historial y verifica que el stock no haya cambiado.

**¿Cómo se usa MySQL?** Con tablas relacionadas por claves foráneas, índices para búsquedas y consultas parametrizadas. Las migraciones incorporan funciones conservando datos existentes. DECIMAL guarda precios y los importes se transportan como texto para conservar centavos.

**¿Qué hace Context API?** Comparte el usuario y acciones de sesión entre pantallas sin pasarlos manualmente por todos los componentes. Axios y SecureStore complementan este estado con comunicación y persistencia.

**¿Cómo funciona el segundo factor?** Después de validar la contraseña, se envía un código de un solo uso al email. Tiene vencimiento y límite de intentos. Activarlo o desactivarlo también requiere código. La seguridad depende de proteger la cuenta de correo.

**¿Cómo funciona el login social?** El navegador solicita autorización al proveedor, el backend valida el código y obtiene la identidad, y finalmente emite tokens propios de StockFlow. Un email coincidente no vincula automáticamente cuentas: así evitamos apropiaciones inseguras.

**¿Qué protege SecureStore?** Los tokens persistentes en Android. No usamos AsyncStorage para guardarlos. La vista web de desarrollo mantiene sesión solo en memoria.

**¿Cómo se genera el APK?** EAS toma configuración, fuentes y credenciales Android y compila. El perfil `preview` pide `buildType: apk`. Un bundle JavaScript exportado o un proyecto Android generado no equivalen a un APK. Luego hay que instalarlo y probarlo contra una API accesible.

**¿Qué falta validar externamente?** Consultar siempre ESTADO_PROYECTO.md: proveedores OAuth, entrega de correo externo, backend HTTPS, build APK y prueba Android tienen evidencia distinta a las pruebas locales.

## Demostración sugerida

1. Mostrar roles y consultas del dashboard.
2. Crear categoría, proveedor y producto; explicar stock inicial cero.
3. Registrar entrada 10 y salida 3; mostrar stock 7 e historial.
4. Intentar salida 8 y explicar el rechazo.
5. Comparar empleado con administrador; mostrar un 403 real.
6. Ver reportes calculados y editar perfil.
7. Mostrar pruebas de concurrencia y rollback.
8. Explicar qué fue probado en Android y qué continúa pendiente, sin presentar integraciones sin credenciales como realizadas.
