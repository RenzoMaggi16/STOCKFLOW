# Auditoría y especialización en cajas de cartón — 28/10/2026

## Estado encontrado antes de implementar
React Native con Expo SDK 58, Expo Router y TypeScript; API Express y mysql2. Existían cambios locales en conexión a MySQL, migrador, temas, dashboard, perfil y autenticación. Se preservaron e integraron.

Implementados: registro, verificación por correo, segundo factor, JWT/refresh, OAuth Google/GitHub/Discord, distribuidoras, invitaciones, cuatro roles, clientes y ranking ponderado, pedidos multiproducto, reservas, preparación, retiro, entrega/fallo, devoluciones y ajustes extraordinarios. Los movimientos usan transacciones y bloqueos. Facebook permanecía en las tablas pero no estaba habilitado en el servicio: fue restaurado sin borrar Discord.

Faltaban: tamaño/tipo de caja, catálogo demo específico, mapa y coordenadas, preferencia automática persistente, cuatro pestañas y dashboard consolidado por rol. No existe una entidad de recepciones planificadas: las recepciones son movimientos al ingresar mercadería. No se inventa una métrica de recepciones pendientes.

## Cambios
- Migración 009 aditiva: size/type, dimensiones, imagen HTTPS y dirección geográfica. Productos históricos mantienen sus datos y quedan sin clasificación hasta revisión.
- Categorías y proveedores se conservan para integridad histórica. Las nuevas cajas usan una categoría interna; el formulario y catálogo no exponen filtros genéricos.
- Seed de 12 cajas cúbicas/rectangulares, tres tamaños y dos tipos. SKU DEMO-CAJA, precios y cantidades ficticios. Transacción, bloqueo de distribuidora y entrada auditada por encargado. Reejecutar no modifica precios, cantidades ni registros existentes.
- Paleta clara/oscura central, preferencia Claro/Oscuro/Automático, formularios y textos suscriptos al contexto de tema, superficies neutras y estados semánticos.
- Dashboard SQL sin gráficos innecesarios, cuatro métricas y secciones inferiores. Ventas obtiene métricas de pedidos propios; reparto solo pedidos asignados.
- Cuatro pestañas por rol y Más para herramientas secundarias.
- Mapa Android/web con Leaflet/OpenStreetMap sin clave y expo-location, permiso en primer plano, marcadores de pedidos asignados, selección y Google Maps. Acciones e historial reutilizan la pantalla del pedido y su backend transaccional.
- Geocodificación configurable compatible con Nominatim en el backend. El usuario confirma candidatos; puede corregir coordenadas. Cambiar dirección sin enviar nuevas coordenadas elimina las anteriores.
- Corrección de fixtures Windows (CRLF) para usar realmente bases temporales, motores InnoDB explícitos y bloqueo de migraciones por base.

## Validación y límites
Ver ESTADO_PROYECTO.md para resultados ejecutados. Un export Android no es una APK ni una prueba en dispositivo. Los proveedores externos requieren sus credenciales; no se declaran ensayados por existir código.

## Cierre 29/10/2026
Migración 009 aplicada en la base configurada tras backup y conciliación verificada del registro 005. SDK 58 redirige rutas con href:null: las herramientas secundarias ocultan solo el botón de pestaña para conservar navegación desde Más. El recorrido automatizado comprueba esta regresión.
