-- precio conserva su significado: precio de venta por unidad.
-- No se inventan costos para productos históricos.
ALTER TABLE productos ADD COLUMN costo_compra DECIMAL(12,2) NULL AFTER precio,
  ADD CONSTRAINT chk_product_cost CHECK (costo_compra IS NULL OR costo_compra >= 0);
