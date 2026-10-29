ALTER TABLE productos MODIFY size VARCHAR(100) NULL, MODIFY type VARCHAR(100) NULL,
 ADD COLUMN atributos JSON NULL;
CREATE TABLE valores_cajas (
 negocio_id INT PRIMARY KEY,
 campos JSON NOT NULL,
 CONSTRAINT fk_valores_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id)
) ENGINE=InnoDB;
