# Manual de usuario

## Antes de empezar

StockFlow necesita conexión con su API y MySQL. Para registrarse y acceder por primera vez, el administrador técnico debe configurar correo SMTP; el acceso social requiere configurar cada proveedor. Una etiqueta «requiere configuración» no es un login simulado.

## Cuenta y acceso

1. Desde la bienvenida elegir Crear cuenta. Escribir nombre, correo y contraseña de al menos 10 caracteres con mayúscula, minúscula y número.
2. En Verificá tu correo pulsar Enviar código. Revisar la casilla, ingresar los seis dígitos y verificar. Código: 10 minutos, cinco intentos. Esperar 60 segundos entre envíos.
3. Iniciar sesión con email/contraseña. Si el segundo factor está activo, ingresar el código recibido. Si se cerró esa pantalla, volver a iniciar sesión y solicitar uno nuevo tras el enfriamiento.
4. Para Google/GitHub/Facebook elegir el botón correspondiente en una build Android configurada. Autorizar en el navegador del sistema y volver a StockFlow. Cancelar no crea una sesión.
5. Si el email ya pertenece a una cuenta creada por otro método, utilizar ese método; la app no vincula cuentas automáticamente.
6. Olvidé mi contraseña solicita un código y permite elegir una nueva contraseña. Se cierran las sesiones anteriores.

La sesión se conserva de forma segura en Android. La vista web de desarrollo requiere nuevo acceso después de recargar la página.

## Navegación

Las cuatro pestañas son Inicio, Productos, Movimientos y Perfil. Inicio muestra productos activos, unidades, stock bajo, faltantes y movimientos recientes. Categorías y Proveedores se abren desde Inicio. Los responsables ven valor de inventario y Reportes; solo administradores ven Usuarios.

## Productos

Buscar nombre/SKU, seleccionar categoría y filtrar disponibles, stock bajo o sin stock. Las listas tienen páginas de veinte registros. Ver producto muestra precio, descripción, stock y mínimo.

Admin/encargado pueden crear y editar. El formulario pide nombre, SKU único, precio decimal con punto, categoría, mínimo y proveedor opcional. Seleccionar referencias desde su listado; no hace falta conocer IDs SQL. El stock inicial es cero y se carga con una entrada. No se edita directamente.

Solo admin puede desactivar. Debe llevar primero el stock a cero mediante una operación justificada. La baja oculta el producto y conserva la auditoría; el SKU continúa reservado.

## Categorías y proveedores

Todos pueden consultar y buscar. Admin/encargado crean y editan. Admin desactiva cuando no hay productos activos asociados. Proveedores permite consultar sus productos. Para quitar ese filtro, usar Quitar filtro de proveedor en Productos.

## Movimientos

Elegir Registrar movimiento, tipo, producto, cantidad y motivo. Revisar operación muestra confirmación; Confirmar guarda. Entradas y salidas requieren cantidad positiva. La app comprueba stock antes de una salida y el backend vuelve a verificarlo dentro de una transacción.

Ajuste solo está disponible a admin/encargado: la cantidad es el stock final deseado, no la diferencia. Ejemplo: stock actual 7 y ajuste 4 deja 4. Siempre indicar motivo.

El historial muestra producto, usuario, fecha, tipo, cantidad, stock anterior/nuevo y motivo. Empleado ve solo sus operaciones. No se editan ni borran movimientos: registrar una corrección autorizada.

## Reportes

Admin/encargado ven valor actual, faltantes, stock bajo y estadísticas por categoría. El gráfico de entradas/salidas usa el período indicado en formato AAAA-MM-DD (UTC), por defecto últimos 30 días; máximo 366. Los ajustes no se cuentan como compras o ventas. Las métricas de stock muestran el estado actual, no una reconstrucción de existencias en una fecha histórica.

## Usuarios

Solo admin puede buscar por nombre/email y filtrar por rol, abrir detalle, editar nombre, cambiar rol y activar/desactivar. Confirmar los cambios sensibles. Un cambio de rol/estado obliga al usuario afectado a iniciar sesión otra vez. El sistema impide que un administrador quite su propio acceso y conserva un administrador activo.

## Perfil y salida

Editar el nombre desde Perfil. Activar/desactivar segundo factor requiere código por correo y después nuevo login. Cerrar sesión pide confirmación, elimina primero los tokens del dispositivo y solicita revocación remota. Si la conexión falla, puede no confirmarse la revocación remota; la sesión local igualmente se borra.

## Errores habituales

- Sin conexión: comprobar red, servidor y URL de API. Usar Reintentar; no repetir movimientos hasta conocer el resultado para evitar operaciones duplicadas.
- Stock insuficiente: otro usuario puede haber registrado una salida; volver a consultar el producto.
- Sin permisos: solicitar al administrador que revise el rol, sin intentar modificarlo en la app.
- Código vencido o agotado: esperar el enfriamiento y pedir otro.
- Correo/proveedor sin configuración: completar la instalación; no hay una cuenta de acceso alternativa.

## Diferencias por rol

Empleado consulta y registra entradas/salidas, con historial propio. Encargado además crea/edita inventario, ajusta y consulta reportes. Administrador también realiza bajas y administra usuarios. Todos gestionan su perfil y seguridad.
