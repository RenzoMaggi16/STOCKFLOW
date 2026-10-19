CREATE TABLE negocios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL,
 rubro VARCHAR(100) NULL,
 descripcion VARCHAR(1000) NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 historico BOOLEAN NOT NULL DEFAULT FALSE,
 creado_por INT NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;
CREATE TABLE negocio_usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 usuario_id INT NOT NULL,
 rol ENUM('admin','encargado','empleado') NOT NULL,
 estado ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
 incorporado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_membresia (negocio_id,usuario_id),
 FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 INDEX idx_membresias_usuario (usuario_id,estado)
) ENGINE=InnoDB;
CREATE TABLE invitaciones (
 id CHAR(36) PRIMARY KEY,
 negocio_id INT NOT NULL,
 email VARCHAR(150) NOT NULL,
 rol ENUM('admin','encargado','empleado') NOT NULL,
 token_hash CHAR(64) NOT NULL UNIQUE,
 estado ENUM('pendiente','aceptada','cancelada') NOT NULL DEFAULT 'pendiente',
 expira_en DATETIME NOT NULL,
 enviado_en DATETIME NULL,
 creado_por INT NOT NULL,
 aceptado_por INT NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 FOREIGN KEY (creado_por) REFERENCES usuarios(id),
 FOREIGN KEY (aceptado_por) REFERENCES usuarios(id),
 INDEX idx_invitaciones_destino (email,estado,expira_en),
 INDEX idx_invitaciones_negocio (negocio_id,estado)
) ENGINE=InnoDB;

-- Archivo explícito de datos previos. Sin propietario ni membresías inferidas.
INSERT INTO negocios(nombre,descripcion,activo,historico)
 VALUES('Inventario histórico previo a multinegocio','Datos conservados sin adjudicar. Requiere asignación explícita del propietario.',FALSE,TRUE);
SET @historico = LAST_INSERT_ID();
ALTER TABLE categorias ADD COLUMN negocio_id INT NULL;
ALTER TABLE proveedores ADD COLUMN negocio_id INT NULL;
ALTER TABLE productos ADD COLUMN negocio_id INT NULL;
ALTER TABLE movimientos_stock ADD COLUMN negocio_id INT NULL;
UPDATE categorias SET negocio_id=@historico;
UPDATE proveedores SET negocio_id=@historico;
UPDATE productos SET negocio_id=@historico;
UPDATE movimientos_stock SET negocio_id=@historico;
ALTER TABLE categorias MODIFY negocio_id INT NOT NULL,
 DROP INDEX nombre, ADD UNIQUE KEY uq_categoria_nombre(negocio_id,nombre),
 ADD UNIQUE KEY uq_categoria_negocio(negocio_id,id),
 ADD FOREIGN KEY (negocio_id) REFERENCES negocios(id);
ALTER TABLE proveedores MODIFY negocio_id INT NOT NULL,
 DROP INDEX nombre, ADD UNIQUE KEY uq_proveedor_nombre(negocio_id,nombre),
 ADD UNIQUE KEY uq_proveedor_negocio(negocio_id,id),
 ADD FOREIGN KEY (negocio_id) REFERENCES negocios(id);
ALTER TABLE productos MODIFY negocio_id INT NOT NULL,
 DROP INDEX sku, ADD UNIQUE KEY uq_producto_sku(negocio_id,sku),
 ADD UNIQUE KEY uq_producto_negocio(negocio_id,id),
 ADD FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 ADD FOREIGN KEY (negocio_id,categoria_id) REFERENCES categorias(negocio_id,id),
 ADD FOREIGN KEY (negocio_id,proveedor_id) REFERENCES proveedores(negocio_id,id),
 ADD INDEX idx_productos_negocio(negocio_id,activo,nombre);
ALTER TABLE movimientos_stock MODIFY negocio_id INT NOT NULL,
 ADD FOREIGN KEY (negocio_id) REFERENCES negocios(id),
 ADD FOREIGN KEY (negocio_id,producto_id) REFERENCES productos(negocio_id,id),
 ADD INDEX idx_movimientos_negocio(negocio_id,creado_en);
-- usuarios.rol_id queda como dato histórico; ya no autoriza operaciones.
