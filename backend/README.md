# Backend StockFlow

Se conserva y amplía el backend inicial. Documentación central en [README general](../README.md), [API](../docs/API.md) e [instalación](../docs/INSTALACION.md).

Comandos: `npm ci`, `npm run migrate` (administrador de esquema), `npm run seed`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run test:integration`.

El esquema inicial se aplica desde `database/schema.sql`; las migraciones incrementales están en `database/migrations`. No volver a crear ni borrar datos para actualizar una instalación existente. `.env` debe usar un usuario MySQL restringido al ejecutar la API.
