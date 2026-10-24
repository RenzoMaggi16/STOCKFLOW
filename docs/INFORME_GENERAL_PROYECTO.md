# Informe general del proyecto StockFlow

**Proyecto final escolar · Aplicación móvil para gestión de distribuidoras**
**Fecha del informe:** 24 de octubre de 2026

## 1. Resumen

StockFlow es una aplicación de inventario y gestión operativa diseñada para distribuidoras pequeñas y medianas. Permite organizar productos, clientes, pedidos y entregas en un mismo sistema, con permisos distintos para jefatura, ventas, depósito y reparto. La aplicación ayuda a mantener las existencias actualizadas, seguir el estado de cada pedido y dejar un historial de los cambios realizados.

El sistema está dividido en una app móvil/web, una API REST y una base de datos MySQL. La API concentra las reglas de negocio y valida los permisos; la base conserva los datos, las relaciones y la auditoría.

## 2. Problema y objetivo

En una distribuidora, la información de productos, pedidos y stock puede quedar repartida entre planillas, mensajes y registros manuales. Esto dificulta saber qué hay disponible, quién preparó un pedido, qué vendedor lo generó o qué entregas faltan.

El objetivo de StockFlow es centralizar ese trabajo y reducir errores mediante:

- Un catálogo único de productos, categorías y proveedores.
- Control de existencias, recepciones y ajustes con historial.
- Registro de clientes y pedidos de varios productos.
- Reserva de stock para pedidos en preparación.
- Seguimiento de repartidores y confirmación de entregas.
- Acceso separado por distribuidora y por función laboral.

## 3. Tecnologías utilizadas

| Área | Tecnología | Uso en StockFlow |
|---|---|---|
| Aplicación móvil y web | React Native 0.86, Expo SDK 57 y TypeScript | Pantallas compartidas para Android y web, con desarrollo mediante Expo Go. |
| Navegación | Expo Router | Organiza rutas, pantallas, pestañas y formularios. |
| Estado de sesión | React Context API | Comparte el usuario, la sesión y la distribuidora activa entre pantallas. |
| Formularios y solicitudes | React Hook Form y Axios | Controla formularios y comunicación HTTP con la API. |
| Almacenamiento de sesión | Expo SecureStore | Guarda tokens en Android; en la vista web de desarrollo la sesión queda en memoria. |
| Visualización | React Native SVG y componentes propios | Dibuja gráficos y elementos visuales del dashboard. |
| Backend | Node.js, Express 5 y TypeScript | Implementa la API REST y coordina validaciones, lógica y acceso a datos. |
| Validación | Zod | Valida los datos que llegan a las rutas antes de procesarlos. |
| Base de datos | MySQL 8.4 y mysql2 | Almacena usuarios, distribuidoras, catálogo, stock, pedidos, movimientos e historial. |
| Contraseñas y tokens | bcrypt, JWT y SHA-256/HMAC-SHA-256 | Protege contraseñas, sesiones y códigos temporales. |
| Correo | Nodemailer sobre SMTP | Envía verificación de email, recuperación, segundo factor e invitaciones. |
| Pruebas | Node.js Test Runner, SMTP local y MySQL temporal | Prueba reglas de negocio, permisos, transacciones y flujos de API. |

## 4. Arquitectura

La aplicación móvil no se conecta directamente a MySQL. Envía solicitudes HTTPS/HTTP a la API, que autentica al usuario, verifica su rol y ejecuta consultas parametrizadas.

```text
App Expo (Android / web)
        │  API REST + JSON
        ▼
Backend Node.js / Express
  rutas → validadores → servicios → repositorios
        │  SQL parametrizado
        ▼
Base de datos MySQL
```

Las rutas reciben las solicitudes; los validadores comprueban formatos y campos; los servicios implementan las reglas del inventario y los pedidos; y MySQL aplica claves foráneas, índices y transacciones. El backend vuelve a comprobar el rol en cada operación: ocultar un botón en la interfaz no se considera una protección de seguridad.

## 5. Funcionalidades implementadas

### Cuentas y acceso

- Registro e inicio de sesión con correo y contraseña.
- Verificación de correo mediante código temporal enviado por SMTP.
- Recuperación de contraseña y cierre de sesiones anteriores.
- Segundo factor opcional con código por correo.
- Inicio social preparado para Google, GitHub y Discord. Cuando el proveedor confirma un email ya asociado a una cuenta existente, StockFlow vincula ese método de acceso a la cuenta; el segundo factor de la cuenta continúa activo.
- Sesiones con access token JWT de corta duración y refresh token rotativo.

### Distribuidoras y equipo

- Una cuenta puede participar en varias distribuidoras y tener un rol distinto en cada una.
- Cada distribuidora contiene su propio equipo, catálogo, clientes, pedidos y movimientos.
- El jefe puede enviar invitaciones por correo, cambiar roles y activar o desactivar integrantes.
- Las invitaciones vencen, se pueden cancelar o reenviar, y solo las acepta la cuenta del correo invitado.

### Catálogo e inventario

- Alta, consulta y edición de productos, categorías y proveedores.
- Precio de compra por unidad y precio de venta por unidad.
- Stock mínimo y existencias iniciales al crear productos; el alta inicial positiva está reservada al rol de Depósito.
- Recepción de mercadería y ajustes ordinarios de stock con motivo.
- Historial de movimientos con cantidad, stock anterior/nuevo, autor, fecha y motivo.
- Solicitudes de ajustes extraordinarios: las solicita Depósito o Ventas y las resuelve el Jefe.
- Dashboard con unidades disponibles y reservadas, productos con stock bajo o sin stock y gráficos de inventario.

### Clientes, pedidos y entregas

- Alta y mantenimiento de clientes con contacto y dirección de entrega.
- Pedidos con varios productos y cantidades; el precio del momento queda guardado en el pedido.
- El pedido no descuenta stock al crearse. Depósito reserva las unidades al aprobar la preparación.
- Depósito marca el pedido como preparado y lo asigna a un repartidor.
- El repartidor confirma retiro, entrega exitosa o entrega fallida.
- Solo la entrega confirmada descuenta existencias y crea movimientos de salida.
- Cancelar o rechazar un pedido libera las reservas; una devolución completa repone stock una sola vez.
- Avisos de pago registrados por Ventas son informativos; no representan un pago verificado.
- Evaluaciones de clientes con historial y puntaje ponderado orientativo: puntualidad 50 %, cumplimiento de acuerdos 30 % y trato 20 %.

## 6. Roles y permisos

Los roles se asignan dentro de cada distribuidora, no a la cuenta global. Una misma persona puede ser, por ejemplo, Jefe en una y Ventas en otra.

| Rol | Qué puede hacer |
|---|---|
| **Jefe / Administrador (`admin`)** | Administra los datos de la distribuidora y el equipo: invita personas, asigna roles y activa o desactiva integrantes. Consulta y edita el catálogo, pero solo crea productos con stock inicial cero. Consulta clientes, pedidos y reportes; puede cancelar pedidos, asignar repartidores, registrar devoluciones y aprobar o rechazar ajustes extraordinarios. No registra recepciones ni ajustes ordinarios de stock. |
| **Depósito (`encargado`)** | Administra el catálogo y el stock operativo. Registra recepciones y ajustes ordinarios, crea productos con existencias iniciales positivas, aprueba/rechaza la preparación y marca pedidos como preparados. Puede asignar repartidores, consultar y evaluar clientes, registrar devoluciones y solicitar ajustes extraordinarios. No administra integrantes ni aprueba sus propias solicitudes extraordinarias. |
| **Ventas (`empleado`)** | Consulta el catálogo, crea y edita clientes, consulta historial y ranking, arma pedidos multiproducto y registra avisos de pago. Puede cancelar únicamente los pedidos que creó y solicitar ajustes extraordinarios. No modifica directamente el stock ni prepara pedidos. |
| **Repartidor (`repartidor`)** | Consulta únicamente los pedidos que tiene asignados. Confirma el retiro, registra la entrega exitosa o informa una entrega fallida. No administra stock ni ve los pedidos asignados a otros repartidores. |

Los cuatro roles pueden consultar el catálogo y gestionar su perfil. Los permisos también se aplican en la API y se limitan al ID de la distribuidora activa.

## 7. Flujo principal de un pedido

1. Ventas selecciona un cliente, agrega uno o más productos y crea el pedido. El precio y el total quedan registrados; el stock físico no cambia.
2. Depósito aprueba la preparación. El sistema comprueba el disponible y reserva todas las cantidades dentro de una transacción.
3. Depósito marca el pedido como preparado y Jefatura o Depósito asigna un repartidor.
4. El repartidor confirma el retiro y registra el resultado de la visita.
5. Al confirmar la entrega, el sistema descuenta stock, consume reservas y registra movimientos de salida en una misma transacción.

Esto evita comprometer las mismas unidades en dos pedidos y conserva el historial si hay un error durante la operación.

## 8. Seguridad e integridad de datos

- Contraseñas con hash bcrypt; nunca se guardan como texto plano.
- JWT de acceso y refresh tokens con rotación; los refresh se guardan como hashes.
- Los códigos de verificación tienen vencimiento, límite de intentos y se consumen una sola vez.
- El OAuth utiliza `state`, un ticket efímero de un solo uso y prueba de posesión entre backend y app. Los secretos de proveedores se mantienen en el backend.
- Las escrituras de stock y pedidos usan transacciones y bloqueos SQL para evitar actualizaciones parciales y sobreventa.
- Las tablas de negocio incluyen `negocio_id`; claves foráneas compuestas ayudan a impedir referencias entre distribuidoras.
- Las bajas de catálogo son lógicas para conservar auditoría. Los movimientos no se borran ni editan.
- Validación de entradas con Zod y consultas SQL parametrizadas.

## 9. Modelo de datos resumido

Las entidades principales son:

- **Identidad:** usuarios, sesiones, códigos de verificación y proveedores OAuth.
- **Organización:** distribuidoras, integrantes y sus roles, invitaciones.
- **Inventario:** productos, categorías, proveedores y movimientos de stock.
- **Ventas y reparto:** clientes, pedidos, detalles de pedido, reservas, historial de estados y evaluaciones.
- **Control:** solicitudes y revisiones de ajustes extraordinarios.

Las migraciones SQL amplían gradualmente el esquema. Una instalación con datos debe respaldarse antes de aplicar nuevas migraciones.

## 10. Pruebas y verificaciones

En la última ejecución de integración del backend se completaron **32 pruebas con 32 aprobadas y 0 fallidas**. Incluyen autenticación, permisos, multinegocio, inventario, transacciones, solicitudes de ajuste, pedidos, reservas, entregas, devoluciones y vinculación de un correo social verificado a una cuenta existente.

La app móvil también pasó `lint` y `typecheck` después de los últimos cambios de interfaz. La prueba de recorrido móvil/API/MySQL está incluida en el proyecto; la ejecución sobre un teléfono y el build de APK son verificaciones separadas.

## 11. Cómo ejecutar el proyecto localmente

Se necesitan Node.js, dependencias instaladas, MySQL disponible y variables locales configuradas. En dos terminales, desde la carpeta del repositorio:

```bash
cd backend
npm ci
npm run dev
```

```bash
cd mobile
npm ci
npx expo start --go
```

Para abrir en Expo Go, el teléfono y la computadora deben estar en la misma red y la app debe apuntar a la dirección LAN de la computadora para la API. El inicio social requiere además que el callback del backend sea HTTPS y coincida exactamente con el registrado en la consola del proveedor. Un túnel Cloudflare Quick Tunnel sirve para pruebas temporales; su URL cambia al reiniciarlo.

## 12. Estado y límites actuales

- La app y la API se pueden ejecutar localmente. El acceso desde Expo Go requiere la red local; el callback social local necesita un túnel HTTPS.
- El túnel `trycloudflare.com` es temporal y se usa para desarrollo, no como dirección estable de producción.
- El repositorio incluye configuración para desplegar la API, pero aún hace falta completar un hosting estable y configurar allí las variables privadas.
- No se ha compilado ni entregado un APK de producción. La exportación JavaScript no equivale a un APK instalable.
- El inicio social está implementado; después del cambio de vinculación automática segura, queda validar nuevamente el recorrido completo con las credenciales reales y el callback activo.
- Antes de producción se deben configurar HTTPS estable, respaldos, políticas de limpieza de datos temporales y monitoreo.

## 13. Cierre para la presentación

StockFlow transforma tareas de inventario y distribución en un flujo compartido y auditable. La app ofrece pantallas sencillas para cada integrante, mientras el backend aplica las reglas de permisos, reservas y movimientos. Su principal decisión de diseño es que el stock solo se descuenta cuando la entrega se confirma; así el inventario refleja la operación real y queda registro de quién hizo cada cambio.

## Documentación relacionada

- [Manual de usuario](MANUAL_USUARIO.md)
- [Matriz de roles y permisos](MATRIZ_ROLES.md)
- [Arquitectura técnica](ARQUITECTURA.md)
- [Referencia de la API](API.md)
- [Instalación y configuración](INSTALACION.md)
- [Estado y evidencia de pruebas](ESTADO_PROYECTO.md)
