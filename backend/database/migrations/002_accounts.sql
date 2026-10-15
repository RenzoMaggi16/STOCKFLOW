ALTER TABLE usuarios ADD COLUMN segundo_factor BOOLEAN NOT NULL DEFAULT FALSE,
 ADD COLUMN token_version INT NOT NULL DEFAULT 0;
CREATE TABLE verificaciones (
 id CHAR(36) PRIMARY KEY, usuario_id INT NOT NULL,
 codigo_hash CHAR(64) NOT NULL,
 tipo ENUM('email','reset','mfa','mfa_setup','mfa_disable') NOT NULL,
 expira_en DATETIME NOT NULL, utilizado_en DATETIME NULL,
 intentos INT NOT NULL DEFAULT 0, creado_en DATETIME NOT NULL,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 INDEX idx_verificaciones_usuario (usuario_id,tipo,creado_en)
);
CREATE TABLE auth_proveedores (
 id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL,
 proveedor ENUM('google','github','facebook') NOT NULL,
 proveedor_usuario_id VARCHAR(255) NOT NULL,
 UNIQUE(proveedor,proveedor_usuario_id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
CREATE TABLE oauth_flujos (
 state_hash CHAR(64) PRIMARY KEY,
 proveedor ENUM('google','github','facebook') NOT NULL,
 challenge CHAR(43) NOT NULL, ticket_hash CHAR(64) NULL UNIQUE,
 usuario_id INT NULL, expira_en DATETIME NOT NULL, usado BOOLEAN DEFAULT FALSE,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
CREATE TABLE admin_lock (id INT PRIMARY KEY);
INSERT INTO admin_lock VALUES(1);
CREATE INDEX idx_movimientos_fecha ON movimientos_stock(creado_en);
