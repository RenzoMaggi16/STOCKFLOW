-- Ejecutar desde un usuario administrador de MySQL; elegir una clave fuerte.
CREATE USER IF NOT EXISTS 'stockflow_app'@'localhost' IDENTIFIED BY 'CAMBIAR_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON stockflow.* TO 'stockflow_app'@'localhost';
-- Las migraciones de esquema se ejecutan con un usuario administrador, no con el usuario de la aplicación.
