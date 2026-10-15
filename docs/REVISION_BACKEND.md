# Revisión realizada — 11 de octubre de 2026

## Punto de partida

Se leyó la especificación completa y todos los módulos iniciales. El backend original pasó typecheck y build. No existían pruebas automatizadas ni CRUD de inventario. No había un servidor MySQL instalado entre las herramientas disponibles.

## Correcciones

- Hash bcrypt de respaldo válido para login de cuentas inexistentes.
- Máximo de contraseña en bytes UTF-8 para impedir truncado de bcrypt; email normalizado antes de validar.
- JWT: expiración obligatoria y subject entero positivo seguro, además de firma, tipo, emisor y audiencia.
- Registro y sesión inicial en una transacción; búsqueda del rol empleado por nombre.
- Login, refresh y logout coordinados mediante bloqueo de usuario. Reutilización revoca los refresh activos y confirma esa revocación antes de responder 401.
- Zona UTC en driver y sesión SQL.
- Respuestas uniformes para conflictos SQL y cuerpos demasiado grandes.
- Prueba de PATCH detectó el valor predeterminado aplicado a campos omitidos: corregido y cubierta la conservación de stock mínimo.

## Implementación

Migración `001_inventory.sql`, repositorio y servicio de inventario, validadores y rutas para categorías, proveedores, productos y movimientos. Precios DECIMAL; productos con stock cero; bajas lógicas; validación de referencias; bloqueo por producto y auditoría en transacción; empleados limitados a su propio historial.

Se agregaron runner de migraciones, seed repetible, package-lock y documentación. Se conservaron rutas de autenticación y demostración.

## Comprobaciones reales

| Comando / prueba | Resultado |
|---|---|
| npm install | Dependencias instaladas |
| npm run typecheck | Correcto |
| npm run build | Correcto (también ejecutado por ambos comandos test) |
| npm test | 3 pruebas, todas correctas |
| npm run test:integration | 6 escenarios + prueba contenedora; 7 informadas por Node, todas correctas |
| npm run migrate | Correcto; repetición comprobada sobre base temporal |
| npm run seed (dos veces) | 2 productos demo, stock total 0, sin duplicación |
| npm start + GET /api/health | Servidor iniciado; JSON success true |
| npm audit --omit=dev | 0 vulnerabilidades reportadas en ese momento |

Integración ejecutada en MySQL 8.4.11: registro/login y roles, renovación concurrente/reutilización/logout y UTC, CRUD, movimientos concurrentes, rollback ante falla de auditoría y usuario desactivado. Cada ejecución crea y elimina su propia base temporal; no borra la base de desarrollo.

## Límites y continuación

Los access tokens emitidos no se revocan instantáneamente con logout. No hay pruebas de carga ni despliegue productivo. MySQL local está instalado y fue iniciado manualmente en 3307; no se configuró inicio automático. API iniciada en 3000. `.env` local tiene secretos aleatorios y usuario de aplicación restringido.

Siguiente bloque sugerido: reportes y administración de usuarios (protegiendo al último administrador), luego frontend Expo conectado. OAuth, email, recuperación y APK continúan pendientes; no se presentan como implementados.
