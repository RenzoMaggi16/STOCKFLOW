# StockFlow · Distribuidora mayorista de cajas de cartón

Catálogo por tamaño y tipo, cuatro roles, stock auditado, pedidos multiproducto, clientes/ranking y entregas con mapa Android.

La especialización del 28/10/2026 está documentada en [auditoría](docs/AUDITORIA_CARTON.md), [instalación](docs/INSTALACION.md), [API](docs/API.md) y [estado verificable](docs/ESTADO_PROYECTO.md). Conserva los módulos e historial existentes.

# StockFlow

Aplicación móvil de gestión de distribuidoras, desarrollada como proyecto final escolar. Cada persona puede crear distribuidoras, invitar integrantes por correo y trabajar con un rol diferente en cada una. Productos, clientes, pedidos, reservas, entregas y movimientos se aíslan por distribuidora.

## Estado real

La API y la app Expo incluyen cuatro roles, clientes, pedidos multiproducto, reservas, entregas, devoluciones y ranking. Hay pruebas de integración de estos flujos con MySQL temporal. El registro por correo fue comprobado por el usuario; el retorno OAuth real de cada proveedor sigue pendiente de validar. **No hay APK compilado ni prueba en teléfono**. Ver [matriz de roles](docs/MATRIZ_ROLES.md) y [estado y evidencia](docs/ESTADO_PROYECTO.md).

## Tecnologías y arquitectura

- React Native, Expo SDK 57, TypeScript, Expo Router, Context API, Axios, SecureStore, React Hook Form y SVG para gráficos.
- Node.js, Express 5, TypeScript, MySQL 8.4, mysql2, Zod, bcrypt, JWT, Nodemailer.
- La app consume la API REST. La API valida identidad, rol y correo; MySQL conserva datos y auditoría. Cambios de stock usan transacciones y bloqueo de fila.

```text
stockflow/
  backend/        # Backend original conservado y ampliado
  mobile/         # App Expo, componentes y pruebas
  docs/           # Instalación, API, arquitectura y defensa
  README.md
  .gitignore
```

## Funciones y roles

| Rol | Sus tres acciones exclusivas |
|---|---|
| Jefe/administrador | Invitar o desactivar empleados; asignar roles; resolver ajustes extraordinarios |
| Encargado de depósito | Recibir mercadería; aprobar o rechazar preparación; ajustar inventario ordinariamente |
| Empleado de ventas | Crear clientes; crear pedidos; registrar avisos de pago |
| Repartidor | Confirmar retiro; confirmar entrega; registrar fallas |

Incluye registro, recuperación, verificación de email y segundo factor opcional por correo. Registrarse crea una identidad sin rol global. Crear una distribuidora asigna el rol administrador de esa distribuidora; las invitaciones asignan el rol elegido. Las salidas de stock ocurren al confirmar entregas, con reservas previas y auditoría. Ver el detalle de endpoints y permisos en [MATRIZ_ROLES.md](docs/MATRIZ_ROLES.md).

Las migraciones 005 y 007 conservan el inventario previo y amplían el modelo sin recrear las tablas existentes. La 005 archiva el inventario anterior a multinegocio sin asignarle un dueño automáticamente. Hacé copia de MySQL antes de actualizar una instalación con datos. Ver [Multinegocio](docs/MULTINEGOCIO.md).

## Inicio rápido

Primero seguir [instalación completa](docs/INSTALACION.md) para MySQL, migraciones y variables.

```sh
cd backend
npm ci
npm run dev
```

En otra terminal:

```sh
cd mobile
npm ci
# Copiar .env.example a .env y configurar la URL para tu dispositivo.
npm start
```

Para vista web local: `EXPO_PUBLIC_API_URL=http://127.0.0.1:3000/api npm run web`. La persistencia web es solo en memoria; la persistencia segura es Android/SecureStore.

## Comprobaciones

```sh
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix mobile run typecheck
npm --prefix mobile test
npm --prefix mobile run export:android
```

La integración necesita MySQL. Las bases temporales `stockflow_test_*` se crean y eliminan de forma aislada. En este equipo se usa `TEST_DB_PORT=3306` para las pruebas. Ver [matriz y pruebas](docs/MATRIZ_ROLES.md).

## APK

Configurar SMTP, OAuth, backend HTTPS y un proyecto EAS real antes de la presentación. Desde `mobile`: `npx eas-cli@24.12.1 init`, configurar `EAS_PROJECT_ID`, luego `npx eas-cli@24.12.1 build --platform android --profile preview`. El perfil solicita `.apk`, no `.aab`. No ejecutar un build que implique cobro sin aprobarlo. La configuración rechaza builds de presentación apuntando a localhost o sin HTTPS.

## Documentación

- [API](docs/API.md)
- [Instalación, SMTP, OAuth y Android](docs/INSTALACION.md)
- [Manual de usuario](docs/MANUAL_USUARIO.md)
- [Arquitectura y entidad-relación](docs/ARQUITECTURA.md)
- [Defensa escolar](docs/DEFENSA_PROYECTO.md)
- [Estado, pruebas y bloqueos](docs/ESTADO_PROYECTO.md)

Los secretos locales, dependencias, builds, claves de firma y archivos nativos generados están excluidos de Git. No se realizó un despliegue externo ni se contrató hosting.
