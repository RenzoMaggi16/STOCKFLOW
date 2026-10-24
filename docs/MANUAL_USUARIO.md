# Manual de usuario

## Antes de empezar

StockFlow necesita conexión con su API y MySQL. Para registrarse y acceder por primera vez, el administrador técnico debe configurar correo SMTP; el acceso social requiere configurar cada proveedor. Una etiqueta «requiere configuración» no es un login simulado.

## Cuenta y acceso

1. Desde la bienvenida elegir Crear cuenta. Escribir nombre, correo y contraseña de al menos 10 caracteres con mayúscula, minúscula y número.
2. En Verificá tu correo pulsar Enviar código. Revisar la casilla, ingresar los seis dígitos y verificar. Código: 10 minutos, cinco intentos. Esperar 60 segundos entre envíos.
3. Iniciar sesión con email/contraseña. Si el segundo factor está activo, ingresar el código recibido. Si se cerró esa pantalla, volver a iniciar sesión y solicitar uno nuevo tras el enfriamiento.
4. Para Google/GitHub/Discord elegir el botón correspondiente desde web o una build Android configurada. Autorizar en el navegador y volver a StockFlow. Cancelar no crea una sesión.
5. Si el correo de Google/GitHub/Discord coincide con una cuenta existente y el proveedor lo confirma como verificado, StockFlow vincula el acceso social a esa cuenta. Si no puede verificar el correo, usá el método original para proteger la cuenta.
6. Olvidé mi contraseña solicita un código y permite elegir una nueva contraseña. Se cierran las sesiones anteriores.

La sesión se conserva de forma segura en Android. La vista web de desarrollo requiere nuevo acceso después de recargar la página.

## Navegación

Después de verificar el correo, si no tenés distribuidoras se abre Tus distribuidoras. Elegí Crear distribuidora, completá nombre, rubro y descripción y confirmá. Serás administrador de esa distribuidora. Si tenés una sola se selecciona automáticamente; si tenés varias, elegí una. Cambiar distribuidora está disponible en Inicio y Perfil: descarta los datos visibles y carga la información de la elegida.

Las pestañas cambian según el rol: Inicio, Productos, Clientes, Pedidos, Stock y Perfil cuando corresponda. El repartidor ve Inicio, Entregas y Perfil. Inicio muestra el inventario o las entregas asignadas. Categorías y Proveedores se abren desde Inicio; solo administradores ven Equipo. Mi distribuidora muestra su información y permite editarla si sos administrador.

## Productos

Buscar nombre/SKU, seleccionar categoría y filtrar disponibles, stock bajo o sin stock. Las listas tienen páginas de veinte registros. Ver producto muestra precio, descripción, stock y mínimo.

Admin/encargado pueden crear y editar. El formulario pide nombre, SKU único, precio decimal con punto, categoría, mínimo y proveedor opcional. Seleccionar referencias desde su listado; no hace falta conocer IDs SQL. Solo depósito puede cargar existencias iniciales positivas al crear el producto; el administrador lo crea con stock cero. Para cambiar stock después se registra una recepción o ajuste de depósito.

En Categoría o Proveedor, escribí el nombre en Buscar y presioná Enter (o el botón Usar o crear en celular). Si ya existe, se selecciona; si no, se crea dentro del negocio activo y queda seleccionada. El registro se guarda inmediatamente, aunque canceles el producto. Las colisiones de nombres se informan sin duplicar registros.

Compra y venta: indicá el costo de compra por unidad (opcional) y el precio de venta por unidad, con punto decimal y en la misma moneda. Vacío significa costo desconocido; cero significa costo cero conocido. Al ingresar ambos importes se muestra la diferencia por unidad y el margen sobre venta, antes de impuestos y gastos. Vender por debajo del costo genera una advertencia, pero se permite. Estos son valores actuales del catálogo: no calculan ganancia histórica ni cambian los movimientos anteriores.

Solo admin puede desactivar. Debe llevar primero el stock a cero mediante una operación justificada. La baja oculta el producto y conserva la auditoría; el SKU continúa reservado.

## Categorías y proveedores

Todos pueden consultar y buscar. Admin/encargado crean y editan. Admin desactiva cuando no hay productos activos asociados. Proveedores permite consultar sus productos. Para quitar ese filtro, usar Quitar filtro de proveedor en Productos.

## Clientes, pedidos y entregas

Ventas abre Clientes → Nuevo cliente, completa nombre comercial y dirección de entrega, y opcionalmente contacto, correo, teléfono y observaciones. El listado muestra una prioridad de 1 a 5 estrellas; jefe o depósito pueden evaluar puntualidad de pagos, cumplimiento de acuerdos y trato. Cada evaluación guarda motivo y fecha. El historial del cliente conserva pedidos y evaluaciones. La puntuación es orientativa.

En Pedidos → Nuevo pedido, ventas elige cliente y agrega productos con cantidad. Puede combinar varios productos; el precio unitario y el total quedan fijados al crear. Crear un pedido no resta stock. Depósito abre el detalle, aprueba la preparación (que reserva las unidades disponibles), marca preparado y asigna un repartidor. Si falta stock, la aprobación responde con un error sin crear reservas parciales. Rechazar o cancelar libera reservas.

Reparto ve solo sus pedidos asignados en Entregas. Confirma retiro y luego entrega exitosa o falla con motivo. La entrega exitosa resta stock y genera movimientos de salida una sola vez. La falla conserva las reservas; jefe o depósito pueden reasignar y reintentar, o se puede cancelar. Una devolución completa de un pedido entregado repone stock una vez. El detalle muestra fecha y autor de cada estado.

Ventas puede registrar un aviso de pago en el detalle. Es un dato informativo: **no confirma que el dinero haya llegado**.

## Movimientos

El encargado de depósito elige Registrar recepción o ajuste ordinario, producto, cantidad y motivo. Revisar operación muestra confirmación; Confirmar guarda. La recepción requiere cantidad positiva. Las salidas se generan al confirmar la entrega de pedidos, nunca desde un movimiento manual.

En un ajuste ordinario, la cantidad es el stock final deseado, no la diferencia. Ejemplo: stock actual 7 y ajuste 4 deja 4, si no hay reservas que lo impidan. Los ajustes extraordinarios se solicitan con motivo desde Stock; solo el jefe puede aprobarlos o rechazarlos.

El historial muestra producto, usuario, fecha, tipo, cantidad, stock anterior/nuevo y motivo. Empleado ve solo sus operaciones. No se editan ni borran movimientos: registrar una corrección autorizada.

## Reportes

Admin/encargado ven valor actual, faltantes, stock bajo y estadísticas por categoría. El gráfico de entradas/salidas usa el período indicado en formato AAAA-MM-DD (UTC), por defecto últimos 30 días; máximo 366. Los ajustes no se cuentan como compras o ventas. Las métricas de stock muestran el estado actual, no una reconstrucción de existencias en una fecha histórica.

## Equipo e invitaciones

En Inicio → Equipo, un administrador puede invitar por correo y elegir Ventas, Depósito, Repartidor o Administrador. Se envía un enlace válido por siete días. La sección Invitaciones enviadas permite consultar estado, reenviar (esperando al menos un minuto) o cancelar. Reenviar invalida el enlace anterior. Si el correo falló, la invitación queda pendiente para reintentar.

El destinatario abre el enlace, inicia sesión o se registra con la dirección invitada y verifica ese email. También encontrará la invitación en Tus negocios → Invitaciones recibidas. Al aceptar se incorpora al equipo y comparte su inventario. Un enlace vencido, cancelado, utilizado o perteneciente a otro email no se acepta.

Administrar integrante permite cambiar rol, quitar del negocio o restaurar acceso. Los cambios afectan únicamente ese negocio, sin editar el perfil personal ni cerrar sesiones en otros negocios. Siempre debe quedar un administrador activo. Podés ser administrador en un negocio y empleado en otro.

Mi distribuidora → Desactivar distribuidora exige stock cero, ningún pedido abierto y confirmación. Conserva el historial, cancela invitaciones y bloquea acceso a esa distribuidora. No borra cuentas ni otras distribuidoras.

## Perfil y salida

Editar el nombre desde Perfil. Activar/desactivar segundo factor requiere código por correo y después nuevo login. Cerrar sesión pide confirmación, elimina primero los tokens del dispositivo y solicita revocación remota. Si la conexión falla, puede no confirmarse la revocación remota; la sesión local igualmente se borra.

## Errores habituales

- Sin conexión: comprobar red, servidor y URL de API. Usar Reintentar; no repetir movimientos hasta conocer el resultado para evitar operaciones duplicadas.
- Stock insuficiente: otro usuario puede haber registrado una salida; volver a consultar el producto.
- Sin permisos: solicitar al administrador que revise el rol, sin intentar modificarlo en la app.
- Código vencido o agotado: esperar el enfriamiento y pedir otro.
- Correo/proveedor sin configuración: completar la instalación; no hay una cuenta de acceso alternativa.

## Diferencias por rol

Ventas crea clientes y pedidos y registra avisos de pago. Depósito recibe mercadería, aprueba preparación y ajusta stock ordinariamente. Repartidor retira, entrega o registra fallas solo en pedidos asignados. Jefe invita y administra roles y decide ajustes extraordinarios. Todos gestionan su perfil y seguridad. Ver [matriz completa](MATRIZ_ROLES.md).
