# APK con indicaciones externas

La URL ya está configurada en los perfiles preview y production de mobile/eas.json:
`https://stockflow-api-renzo.onrender.com/api`.

La pestaña Indicaciones muestra las entregas asignadas con un botón para abrir Google Maps. Usa coordenadas confirmadas o la dirección del cliente cuando faltan coordenadas. No incluye mapa integrado ni solicita ubicación desde StockFlow.

El botón de indicaciones abre Google Maps como aplicación o página externa; ese enlace tampoco necesita clave. La búsqueda de direcciones del backend sigue configurándose por separado con GEOCODING_URL.

## Compilar
Desde mobile ejecutá `npm run build:apk`. EAS usa la URL pública configurada. No hace falta cargar variables de Google Maps. Si cambiás el backend, actualizá EXPO_PUBLIC_API_URL en mobile/eas.json y generá otra APK.

## Verificar en el teléfono
1. Descargar e instalar la APK del enlace de EAS.
2. Iniciar sesión con un repartidor que tenga pedidos asignados.
3. Abrir Indicaciones y elegir una entrega.
4. Probar el botón Indicaciones en Google Maps con coordenadas y con dirección.
5. Abrir indicaciones y registrar retiro o entrega sobre un pedido de prueba.

El servicio de Render debe estar activo y conectado a MySQL. Su endpoint `/api/health` permite comprobar disponibilidad HTTP; por sí solo no comprueba login ni base de datos.

Referencias: [Expo WebView](https://docs.expo.dev/versions/v58.0.0/sdk/webview/), [política de mapas OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
