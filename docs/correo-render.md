# Correos de verificación y recuperación

Render Free bloquea SMTP en los puertos 25, 465 y 587. StockFlow usa la API
HTTPS de Brevo cuando `BREVO_API_KEY` está configurada; SMTP queda disponible
para desarrollo y otros alojamientos.

## Configuración de producción

1. En Brevo, generar una **clave API**, distinta de una clave SMTP.
2. En Render → stockflow-api-renzo → Environment, agregar `BREVO_API_KEY`.
3. Configurar `SMTP_FROM=StockFlow <correo@dominio.com>` con un remitente
   verificado y autorizado en Brevo. Esta variable también se usa con HTTPS.
4. Guardar y desplegar la última versión de `main`.
5. En la app, solicitar el código de verificación. Revisar entrada y spam;
   consultar también los registros transaccionales de Brevo.
6. En Recuperar contraseña, pedir un código, cambiar la contraseña y confirmar
   que se puede ingresar con la nueva y que la anterior ya no funciona.

Nunca poner la clave API en variables `EXPO_PUBLIC_*`, EAS, GitHub ni en la APK.
Cambiar esta configuración del servidor no requiere reconstruir la APK.

Si Brevo rechaza la solicitud, el servidor registra solamente el estado HTTP
y devuelve `MAIL_UNAVAILABLE`. Revisar autorización de la clave, remitente y
límites de la cuenta. La aceptación del proveedor no garantiza la llegada a
la bandeja de entrada; los eventos de entrega se consultan en Brevo.

## Validación automatizada

- `cd backend; npm test`: transporte HTTPS y errores del proveedor.
- `node --test tests/integration/accounts.test.cjs`: base MySQL local de pruebas
  en puerto 3307; verifica registro, reenvío, consumo único, recuperación,
  revocación de sesiones y fallos de envío. Brevo se simula, sin enviar a usuarios.
- `cd mobile; npm run typecheck; npm run lint; npm test`.
