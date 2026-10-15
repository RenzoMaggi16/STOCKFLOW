CREATE TABLE categorias (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 descripcion VARCHAR(500) NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE proveedores (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE,
 email VARCHAR(150) NULL,
 telefono VARCHAR(40) NULL,
 direccion VARCHAR(250) NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE productos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(150) NOT NULL,
 descripcion VARCHAR(1000) NULL,
 sku VARCHAR(64) NOT NULL UNIQUE,
 precio DECIMAL(12,2) NOT NULL,
 stock INT NOT NULL DEFAULT 0,
 stock_minimo INT NOT NULL DEFAULT 0,
 categoria_id INT NOT NULL,
 proveedor_id INT NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (categoria_id) REFERENCES categorias(id),
 FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
 CHECK (precio >= 0), CHECK (stock >= 0), CHECK (stock_minimo >= 0),
 INDEX idx_productos_lista (activo,nombre)
) ENGINE=InnoDB;
CREATE TABLE movimientos_stock (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 producto_id INT NOT NULL,
 usuario_id INT NOT NULL,
 tipo ENUM('entrada','salida','ajuste') NOT NULL,
 cantidad INT NOT NULL,
 stock_anterior INT NOT NULL,
 stock_nuevo INT NOT NULL,
 motivo VARCHAR(500) NOT NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (producto_id) REFERENCES productos(id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 CHECK (stock_anterior >= 0 AND stock_nuevo >= 0),
 CHECK ((tipo='entrada' AND cantidad>0 AND stock_nuevo=stock_anterior+cantidad)
 OR (tipo='salida' AND cantidad>0 AND stock_nuevo=stock_anterior-cantidad)
 OR (tipo='ajuste' AND cantidad>=0 AND stock_nuevo=cantidad)),
 INDEX idx_movimientos_usuario (usuario_id,id),
 INDEX idx_movimientos_producto (producto_id,id)
) ENGINE=InnoDB;
