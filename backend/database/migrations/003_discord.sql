-- Conserva identidades históricas de Facebook; nuevos accesos usan Discord.
ALTER TABLE auth_proveedores MODIFY proveedor ENUM('google','github','facebook','discord') NOT NULL;
ALTER TABLE oauth_flujos MODIFY proveedor ENUM('google','github','facebook','discord') NOT NULL;
