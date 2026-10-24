# Defensa del proyecto StockFlow

## Presentación de dos minutos

StockFlow organiza una distribuidora: productos, clientes, pedidos de varios artículos y entregas. La app Expo habla con una API REST que valida JWT, membresía y uno de cuatro roles antes de guardar en MySQL. Ventas crea el pedido; depósito reserva las unidades; reparto confirma la entrega y recién entonces se descuenta el stock. Cada cambio queda auditado y una transacción evita inconsistencias aunque dos personas trabajen a la vez.

## Preguntas y respuestas

**¿Qué problema resuelve?** Reduce errores de planillas separadas, stock desactualizado y falta de trazabilidad. Las alertas ayudan a detectar reposición y el historial permite explicar cambios.

**¿Por qué React Native y Expo?** Permiten crear pantallas con TypeScript y componentes móviles reutilizables. Expo integra navegación, almacenamiento seguro y el proceso de compilación Android. La vista web sirve para parte de las pruebas, pero no reemplaza probar un APK.

**¿Cómo se comunica la app con la API?** Axios envía solicitudes HTTP con JSON y un Bearer token. Por ejemplo, listar productos es GET; crear es POST; editar parcialmente es PATCH. La API devuelve datos o errores con códigos HTTP.

**¿Qué es REST?** Una forma de organizar recursos y acciones HTTP. Productos, usuarios y movimientos tienen rutas estables; cada método comunica la operación solicitada.

**¿Qué es JWT?** Un token firmado que acredita una identidad y contiene vencimiento, emisor y audiencia. No es una contraseña ni cifrado de todos sus datos. La firma impide modificarlo sin detección. No ponemos secretos dentro del payload.

**¿Para qué sirve el refresh?** Permite obtener otro access token sin volver a escribir contraseña. Dura más, se guarda de forma segura en el teléfono y su hash queda en la base. Se rota y revoca para limitar su reutilización.

**¿Cómo guardan las contraseñas?** Con bcrypt y factor de costo 12. Guardamos un hash, no una contraseña recuperable. El máximo de 72 bytes se valida para evitar el truncamiento de bcrypt.

**¿Qué hace un middleware?** Intercepta una solicitud antes de la operación. En StockFlow valida JWT, usuario activo, versión de sesión, correo verificado y rol. Otro middleware uniforma errores sin enviar trazas al cliente.

**¿Cómo funcionan los roles?** El registro público crea una identidad sin privilegios globales. `negocio_usuarios` relaciona persona, negocio, rol y estado. Crear un negocio asigna admin al creador dentro de la misma transacción. El rol se vuelve a leer en MySQL para cada negocio; la misma persona puede ser admin de A y empleado de B.

**¿Cómo se aíslan los negocios?** Cada recurso lleva `negocio_id`. La API valida la membresía correspondiente al encabezado `X-Business-Id` y filtra consultas por ese negocio. Saber el ID de un producto ajeno no permite accederlo. Claves foráneas compuestas impiden asociar categorías o proveedores de otro negocio, incluso mediante SQL directo.

**¿Cómo se invita a empleados?** Un admin elige email y rol. Generamos 32 bytes aleatorios y guardamos solo su hash; el enlace vence en siete días. Aceptar exige autenticación y verificación del mismo correo. La transacción bloquea negocio e invitación, inserta la membresía y marca aceptación de manera atómica. No hay doble aceptación ni promoción automática por poseer un enlace.

**¿Qué ocurre al cambiar de negocio?** No se cambia de cuenta ni de JWT. Se consulta la membresía, se limpia la navegación del inventario y se descartan respuestas tardías del contexto anterior. La próxima petición usa el negocio seleccionado, que el servidor vuelve a autorizar.

**¿Qué pasó con los datos anteriores?** La migración conserva las filas y las asigna a un negocio histórico desactivado, sin integrantes. No se presume quién es el propietario. Su recuperación requiere una asignación explícita autorizada.

**¿Cómo evitan stock negativo?** Al aprobar el pedido, depósito solo puede reservar `stock físico - reservas activas`. La entrega bloquea el pedido y cada producto, resta stock y crea movimientos dentro de una transacción. Dos confirmaciones simultáneas de la misma entrega producen una operación correcta y un 409; no duplican las salidas. Ajustes ordinarios o extraordinarios tampoco pueden bajar del total reservado.

**¿Cuáles son las tres acciones exclusivas de cada rol?** Jefe: invitar o desactivar empleados, asignar roles y resolver ajustes extraordinarios. Depósito: recibir mercadería, aprobar o rechazar preparación y ajustar stock ordinariamente. Ventas: crear clientes, crear pedidos y registrar avisos de pago. Reparto: confirmar retiro, entrega exitosa o fallo. El backend devuelve 403 a cualquier otro rol. [Matriz y pruebas](MATRIZ_ROLES.md).

**¿Qué significa reservar stock?** Las unidades siguen físicamente en el depósito, pero ya no están disponibles para otro pedido. Al entregar, la reserva se consume y se registra la salida. Al cancelar o rechazar se libera. Así se evita prometer las mismas unidades dos veces.

**¿Cómo se calcula el ranking?** La última evaluación guarda 1–5 para puntualidad, acuerdos y trato, más un motivo. La puntuación es `0,5 × puntualidad + 0,3 × acuerdos + 0,2 × trato`. No bloquea clientes ni verifica pagos automáticamente.

**¿Qué es una transacción?** Un grupo de cambios que se guarda completo o se revierte. Actualizar el producto e insertar la auditoría deben ocurrir juntos. La prueba de rollback provoca un fallo al insertar historial y verifica que el stock no haya cambiado.

**¿Cómo se usa MySQL?** Con tablas relacionadas por claves foráneas, índices para búsquedas y consultas parametrizadas. Las migraciones incorporan funciones conservando datos existentes. DECIMAL guarda precios y los importes se transportan como texto para conservar centavos.

**¿Qué hace Context API?** Comparte el usuario y acciones de sesión entre pantallas sin pasarlos manualmente por todos los componentes. Axios y SecureStore complementan este estado con comunicación y persistencia.

**¿Cómo funciona el segundo factor?** Después de validar la contraseña, se envía un código de un solo uso al email. Tiene vencimiento y límite de intentos. Activarlo o desactivarlo también requiere código. La seguridad depende de proteger la cuenta de correo.

**¿Cómo funciona el login social?** El navegador solicita autorización al proveedor, el backend valida el código y obtiene la identidad, y finalmente emite tokens propios de StockFlow. Si el proveedor confirma un correo que ya pertenece a una cuenta, se vincula ese método a la cuenta existente. Si no confirma el correo, la asociación se rechaza para protegerla. El segundo factor sigue vigente.

**¿Qué protege SecureStore?** Los tokens persistentes en Android. No usamos AsyncStorage para guardarlos. La vista web de desarrollo mantiene sesión solo en memoria.

**¿Cómo se genera el APK?** EAS toma configuración, fuentes y credenciales Android y compila. El perfil `preview` pide `buildType: apk`. Un bundle JavaScript exportado o un proyecto Android generado no equivalen a un APK. Luego hay que instalarlo y probarlo contra una API accesible.

**¿Qué falta validar externamente?** Consultar siempre ESTADO_PROYECTO.md: proveedores OAuth, entrega de correo externo, backend HTTPS, build APK y prueba Android tienen evidencia distinta a las pruebas locales.

## Demostración sugerida

1. Registrar/verificar una cuenta y crear una distribuidora; explicar la membresía admin.
2. Invitar cuentas de depósito, ventas y reparto y mostrar que cada una ve acciones distintas.
3. Depósito recibe 10 unidades de un producto. Ventas crea cliente y pedido con dos productos; mostrar precio fijado y reserva sin salida.
4. Depósito aprueba/prepara y asigna. Reparto confirma retiro y entrega; mostrar salida auditada y stock descontado una vez.
5. Evaluar un cliente y explicar los pesos del ranking. Registrar un aviso de pago sin marcarlo como verificado.
6. Mostrar que otra distribuidora no puede acceder a los mismos clientes ni pedidos y que el mismo usuario puede tener otro rol allí.
7. Mostrar pruebas de concurrencia y rollback.
8. Explicar qué fue probado en Android y qué continúa pendiente, sin presentar integraciones sin credenciales como realizadas.
