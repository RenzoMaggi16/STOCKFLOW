-- Se conserva el nombre físico negocio_id para no reescribir relaciones históricas.
-- En la interfaz y API se presenta como distribuidora.
ALTER TABLE negocio_usuarios MODIFY rol ENUM('admin','encargado','empleado','repartidor') NOT NULL;
ALTER TABLE invitaciones MODIFY rol ENUM('admin','encargado','empleado','repartidor') NOT NULL;

CREATE TABLE clientes (
 id INT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 nombre_comercial VARCHAR(150) NOT NULL,
 contacto VARCHAR(150) NULL,
 email VARCHAR(150) NULL,
 telefono VARCHAR(50) NULL,
 direccion_entrega VARCHAR(300) NOT NULL,
 observaciones VARCHAR(1000) NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_cliente_negocio (negocio_id,id),
 INDEX idx_clientes_lista (negocio_id,activo,nombre_comercial),
 FOREIGN KEY (negocio_id) REFERENCES negocios(id)
) ENGINE=InnoDB;

CREATE TABLE pedidos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 cliente_id INT NOT NULL,
 creado_por INT NOT NULL,
 repartidor_id INT NULL,
 estado ENUM('pendiente','en_preparacion','preparado','en_reparto','entregado','entrega_fallida','cancelado','devuelto') NOT NULL DEFAULT 'pendiente',
 total DECIMAL(14,2) NOT NULL,
 observaciones VARCHAR(1000) NULL,
 aviso_pago_en DATETIME NULL,
 aviso_pago_por INT NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_pedido_negocio (negocio_id,id),
 INDEX idx_pedidos_estado (negocio_id,estado,creado_en),
 INDEX idx_pedidos_repartidor (negocio_id,repartidor_id,estado),
 FOREIGN KEY (negocio_id,cliente_id) REFERENCES clientes(negocio_id,id),
 FOREIGN KEY (creado_por) REFERENCES usuarios(id),
 FOREIGN KEY (repartidor_id) REFERENCES usuarios(id),
 FOREIGN KEY (aviso_pago_por) REFERENCES usuarios(id),
 CHECK (total>=0)
) ENGINE=InnoDB;

CREATE TABLE pedido_detalles (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 pedido_id BIGINT NOT NULL,
 producto_id INT NOT NULL,
 cantidad INT NOT NULL,
 precio_unitario DECIMAL(12,2) NOT NULL,
 subtotal DECIMAL(14,2) NOT NULL,
 UNIQUE KEY uq_detalle_producto (pedido_id,producto_id),
 FOREIGN KEY (negocio_id,pedido_id) REFERENCES pedidos(negocio_id,id),
 FOREIGN KEY (negocio_id,producto_id) REFERENCES productos(negocio_id,id),
 CHECK (cantidad>0 AND precio_unitario>=0 AND subtotal>=0)
) ENGINE=InnoDB;

CREATE TABLE reservas_pedido (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 pedido_id BIGINT NOT NULL,
 producto_id INT NOT NULL,
 cantidad INT NOT NULL,
 estado ENUM('activa','consumida','liberada') NOT NULL DEFAULT 'activa',
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_reserva_producto (pedido_id,producto_id),
 INDEX idx_reservas_disponibles (negocio_id,producto_id,estado),
 FOREIGN KEY (negocio_id,pedido_id) REFERENCES pedidos(negocio_id,id),
 FOREIGN KEY (negocio_id,producto_id) REFERENCES productos(negocio_id,id),
 CHECK (cantidad>0)
) ENGINE=InnoDB;

CREATE TABLE pedido_estados (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 pedido_id BIGINT NOT NULL,
 estado VARCHAR(30) NOT NULL,
 usuario_id INT NOT NULL,
 motivo VARCHAR(500) NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (negocio_id,pedido_id) REFERENCES pedidos(negocio_id,id),
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
 INDEX idx_pedido_historial (pedido_id,id)
) ENGINE=InnoDB;

CREATE TABLE evaluaciones_clientes (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 cliente_id INT NOT NULL,
 evaluador_id INT NOT NULL,
 puntualidad TINYINT NOT NULL,
 acuerdos TINYINT NOT NULL,
 trato TINYINT NOT NULL,
 motivo VARCHAR(500) NOT NULL,
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (negocio_id,cliente_id) REFERENCES clientes(negocio_id,id),
 FOREIGN KEY (evaluador_id) REFERENCES usuarios(id),
 INDEX idx_evaluacion_cliente (cliente_id,id),
 CHECK (puntualidad BETWEEN 1 AND 5 AND acuerdos BETWEEN 1 AND 5 AND trato BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE solicitudes_ajuste (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 negocio_id INT NOT NULL,
 producto_id INT NOT NULL,
 solicitado_por INT NOT NULL,
 revisado_por INT NULL,
 stock_propuesto INT NOT NULL,
 motivo VARCHAR(500) NOT NULL,
 estado ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
 creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revisado_en DATETIME NULL,
 FOREIGN KEY (negocio_id,producto_id) REFERENCES productos(negocio_id,id),
 FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
 FOREIGN KEY (revisado_por) REFERENCES usuarios(id),
 INDEX idx_solicitudes_pendientes (negocio_id,estado),
 CHECK (stock_propuesto>=0)
) ENGINE=InnoDB;

ALTER TABLE movimientos_stock ADD COLUMN pedido_id BIGINT NULL,
 ADD FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
 ADD UNIQUE KEY uq_salida_pedido_producto (pedido_id,producto_id,tipo);
