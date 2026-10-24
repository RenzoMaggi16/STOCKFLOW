# Informe breve de roles y permisos — StockFlow

Los permisos se asignan por distribuidora. Una misma persona puede tener distintos roles en cada una. Para operar, debe tener una cuenta activa, correo verificado y membresía vigente en la distribuidora seleccionada.

| Rol | Función y permisos principales |
|---|---|
| **Jefe (`admin`)** | Administra la distribuidora y el equipo: edita sus datos, invita personas, cambia roles y activa o desactiva miembros. Puede consultar y editar productos, categorías y proveedores; crear productos sin stock inicial; consultar pedidos, clientes y ranking; cancelar pedidos; asignar repartidores; registrar devoluciones; y aprobar o rechazar ajustes extraordinarios de stock. No registra recepciones ni prepara pedidos. |
| **Depósito (`encargado`)** | Gestiona el inventario y la preparación: consulta y edita productos, categorías y proveedores; registra recepciones, ajustes ordinarios y movimientos de stock; crea productos con existencias iniciales; aprueba, prepara o rechaza pedidos; asigna repartidores; consulta clientes y ranking, evalúa clientes y registra devoluciones. Puede solicitar ajustes extraordinarios, pero no aprobarlos. No administra miembros. |
| **Ventas (`empleado`)** | Atiende clientes y carga ventas: consulta el catálogo, crea y edita clientes, consulta historial y ranking, crea pedidos con varios productos y registra avisos de pago. Puede cancelar únicamente los pedidos que creó y solicitar ajustes extraordinarios; no modifica directamente el stock ni prepara pedidos. |
| **Repartidor (`repartidor`)** | Realiza entregas: consulta los pedidos que tiene asignados, confirma el retiro, registra una entrega exitosa o informa una entrega fallida. No consulta ni modifica el inventario, ni puede ver pedidos de otros repartidores. |

## Reglas comunes

- Los cuatro roles pueden consultar el catálogo. Jefe y Depósito pueden crear y editar productos, categorías y proveedores; solo Jefe puede desactivar esos registros.
- Las existencias se reservan al aprobar la preparación. Se descuentan del stock físico únicamente cuando el repartidor confirma la entrega. Cancelar o rechazar una preparación libera la reserva.
- Las salidas de stock se generan con las entregas confirmadas; no se permite registrar una salida manual.
- Los avisos de pago de Ventas son informativos y no verifican que el pago se haya realizado.
- Los permisos se vuelven a comprobar en cada operación y se limitan a la distribuidora activa, para proteger los datos entre equipos.
