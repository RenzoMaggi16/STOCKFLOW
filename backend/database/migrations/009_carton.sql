-- Aditiva: los productos históricos quedan sin clasificar hasta su revisión.
ALTER TABLE productos
 ADD COLUMN size ENUM('chica','mediana','grande') NULL,
 ADD COLUMN type ENUM('estandar','reforzada') NULL,
 ADD COLUMN dimensiones VARCHAR(150) NULL,
 ADD COLUMN imagen_url VARCHAR(1000) NULL,
 ADD INDEX idx_cajas (negocio_id,activo,size,type);
ALTER TABLE clientes
 ADD COLUMN localidad VARCHAR(150) NULL,
 ADD COLUMN provincia VARCHAR(150) NULL,
 ADD COLUMN latitud DECIMAL(10,7) NULL,
 ADD COLUMN longitud DECIMAL(10,7) NULL,
 ADD CONSTRAINT chk_coordenadas CHECK ((latitud IS NULL AND longitud IS NULL) OR (latitud IS NOT NULL AND longitud IS NOT NULL AND latitud BETWEEN -90 AND 90 AND longitud BETWEEN -180 AND 180));
