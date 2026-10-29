# Matriz de roles de StockFlow Distribuidoras

Los roles pertenecen a una **distribuidora**, no a la cuenta global. Cada solicitud necesita JWT válido, correo verificado y pertenencia activa a `X-Business-Id`. La API vuelve a consultar el rol y, para escrituras, bloquea la membresía dentro de la transacción. Un mismo usuario puede tener roles distintos en distintas distribuidoras.

| Acción exclusiva | Endpoint | Jefe | Depósito | Ventas | Repartidor |
|---|---|:---:|:---:|:---:|:---:|
| Invitar, activar o desactivar empleados | `POST /businesses/:id/invitations`, `PATCH/DELETE /businesses/:id/members/:userId` | Sí | 403 | 403 | 403 |
| Asignar o cambiar roles | `PATCH /businesses/:id/members/:userId` | Sí | 403 | 403 | 403 |
| Aprobar o rechazar ajuste extraordinario | `POST /stock/adjustment-requests/:id/approve`, `/reject` | Sí | 403 | 403 | 403 |
| Registrar recepción de mercadería | `POST /stock/receive` | 403 | Sí | 403 | 403 |
| Aprobar o rechazar preparación | `POST /orders/:id/approve-preparation`, `/ready`, `/reject-preparation` | 403 | Sí | 403 | 403 |
| Registrar ajuste ordinario | `POST /stock/ordinary-adjustment` | 403 | Sí | 403 | 403 |
| Crear clientes | `POST /clients` | 403 | 403 | Sí | 403 |
| Crear pedidos | `POST /orders` | 403 | 403 | Sí | 403 |
| Registrar aviso de pago | `POST /orders/:id/payment-notice` | 403 | 403 | Sí | 403 |
| Confirmar retiro | `POST /orders/:id/pickup` | 403 | 403 | 403 | Sí |
| Confirmar entrega | `POST /orders/:id/delivered` | 403 | 403 | 403 | Sí |
| Registrar entrega fallida | `POST /orders/:id/delivery-failed` | 403 | 403 | 403 | Sí |

Las funciones compartidas son: consultar catálogo (los cuatro roles), consultar pedidos (repartidor solo los asignados), editar catálogo (jefe y depósito), asignar repartidor (jefe y depósito), cancelar pedido (jefe y ventas; ventas solo los propios), devolver pedido completo (jefe y depósito), evaluar clientes (jefe y depósito), solicitar ajuste extraordinario (depósito y ventas), consultar ranking (jefe, depósito y ventas). Crear un producto con existencias iniciales positivas queda reservado a depósito; el jefe puede crearlo con stock cero. La ruta histórica `POST /movements` solo acepta recepción o ajuste ordinario de depósito y rechaza salidas; estas nacen exclusivamente de una entrega confirmada. La decisión del jefe sobre un ajuste conserva su propio motivo en la migración 008.

## Reglas del stock y los pedidos

1. Ventas crea el pedido con uno o varios productos. Se guarda el precio unitario del momento y el total en centavos, sin modificar stock.
2. Depósito aprueba la preparación. Bajo transacción y bloqueo de la distribuidora/productos, verifica `stock físico - reservas activas >= cantidad` e inserta una reserva por producto.
3. Depósito marca preparado; jefe o depósito asignan repartidor. Solo ese repartidor puede retirar y confirmar entrega o falla.
4. La entrega exitosa descuenta stock, crea movimientos de salida vinculados al pedido, consume reservas y cambia estado en una única transacción. Repetir la entrega recibe 409. La base tiene una clave única por pedido, producto y tipo de movimiento.
5. Cancelar o rechazar libera las reservas sin alterar stock físico. La entrega fallida conserva la reserva hasta reintento, cancelación o resolución. La devolución completa de un pedido entregado repone stock una sola vez y crea movimientos de entrada.
6. Un ajuste ordinario o extraordinario nunca puede dejar stock por debajo de las reservas activas. Un aviso de pago es solo un aviso, **no** un pago verificado.

## Ranking

La última evaluación guardada de cada cliente determina la puntuación `0,5 × puntualidad + 0,3 × acuerdos + 0,2 × trato`, redondeada a dos decimales. Se conservan todas las evaluaciones con autor, fecha y motivo. Clientes sin evaluación aparecen después de los puntuados. La puntuación es orientativa; no bloquea ventas.

## Pruebas

`backend/tests/integration/distributor.test.cjs` usa una base MySQL temporal. Comprueba HTTP 403 cruzado para las 12 acciones exclusivas, aislamiento de distribuidoras, pedido multiproducto y precio fijo, reservas, intento de sobreventa, entrega concurrente con una sola salida por producto, devolución, ranking ponderado, solicitudes extraordinarias y acceso de repartidor solo a pedidos asignados. También se ejecutan pruebas previas de autenticación, JWT, correo, invitaciones e inventario; los casos antiguos que daban salidas manuales a otros roles deben migrarse al nuevo flujo.

Ejecutar con MySQL de pruebas disponible: `TEST_DB_PORT=3306 npm --prefix backend run test:integration`. La migración `007_distributors.sql` conserva productos, usuarios, invitaciones y movimientos previos. Antes de migrar una instalación con datos, hacer copia de la base. La prueba de APK en teléfono requiere una API HTTPS accesible desde Android y un build EAS real; una exportación JS no la sustituye.


## Confirmación de exclusividad en la especialización
| Rol | Tres operaciones exclusivas | Rutas |
|---|---|---|
| Jefe (admin) | Invitar/administrar empleados; cambiar roles; revisar ajustes extraordinarios | /businesses/:id/invitations, /businesses/:id/members/:id, /stock/adjustment-requests/:id/approve o reject |
| Encargado | Recibir cajas; aprobar/rechazar preparación; ajuste ordinario | /stock/receive, /orders/:id/approve-preparation o reject-preparation, /stock/ordinary-adjustment |
| Ventas (empleado) | Crear cliente; crear pedido; aviso de pago | POST /clients, POST /orders, /orders/:id/payment-notice |
| Repartidor | Retiro; entrega; fallo de entrega | /orders/:id/pickup, delivered, delivery-failed |

Otros roles reciben 403 en acciones exclusivas. Un repartidor no asignado recibe 404 para un pedido ajeno. Mapas reutiliza /deliveries y no amplía permisos. Geocodificación: admin y empleado, quienes editan direcciones; el repartidor no modifica clientes. La navegación visible no sustituye autorización de backend.
