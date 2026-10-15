# StockFlow

Aplicación de inventario para comercios, desarrollada como proyecto final escolar. Permite organizar productos, proveedores y categorías; registrar entradas, salidas y ajustes; consultar reportes y administrar permisos.

## Estado real

Backend y frontend implementados, con pruebas locales. OAuth Google/GitHub/Facebook está preparado **sin validación con credenciales reales**. Correo y segundo factor se verificaron con SMTP local de pruebas, no con casillas externas. Se exportó el bundle Android y se generó el proyecto nativo; **no hay APK compilado ni prueba en teléfono**. Ver [checklist y evidencia](docs/ESTADO_PROYECTO.md).

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

| Función | Admin | Encargado | Empleado |
|---|---|---|---|
| Consultar inventario, categorías y proveedores | Sí | Sí | Sí |
| Crear/editar catálogos y productos | Sí | Sí | No |
| Desactivar catálogos y productos | Sí | No | No |
| Entradas y salidas | Sí | Sí | Sí |
| Ajustes, reportes y todo el historial | Sí | Sí | No |
| Historial propio y perfil | Sí | Sí | Sí |
| Administrar usuarios | Sí | No | No |

Incluye registro, recuperación, verificación de email y segundo factor opcional por correo. Las cuentas nuevas siempre son empleados. El stock no se cambia editando productos; cada movimiento conserva autor, fecha, motivo y cantidades anterior/nueva.

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

La integración necesita MySQL. Las bases temporales `stockflow_test_*` se crean y eliminan de forma aislada. Ver [pruebas web y evidencia](docs/ESTADO_PROYECTO.md).

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
