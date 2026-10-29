-- =====================================================================================
-- Limpieza de la base de datos de producción (Neon > Query)
-- Ejecutar DESPUÉS de desplegar la corrección del código. Pasos en orden; cada uno
-- indica el resultado esperado. Si un resultado no coincide, detente y revisa.
-- Importante: mientras la versión con el bug siga en uso pueden aparecer filas nuevas.
-- Vuelve a correr las consultas de revisión (pasos 1 y 5) justo antes de borrar y, si
-- salen más filas o pares de los esperados, agrégalos a las listas de ids.
-- =====================================================================================

-- PASO 1. Revisión: movimientos cuyo producto no existe en esa área (nombre exacto, igual que la app).
--   Esperado: 19 filas. Se conservan la 23 (su producto en NUCAN tiene un espacio al final del
--   nombre; se arregla en el paso 3) y la 60 (producto borrado, historial legítimo). Las otras 17
--   son fantasma: el producto pertenece a otra categoría.
SELECT m.id, m.date, m.area, m.product, m.qty, m.type,
       (SELECT string_agg(p2.area || ' #' || p2.id, ', ') FROM products p2 WHERE p2.name = m.product) AS existe_en
FROM movements m
LEFT JOIN products p ON p.name = m.product AND p.area = m.area
WHERE p.id IS NULL
ORDER BY m.id;

-- PASO 2. Respaldo y borrado de las 17 filas fantasma.
--   a) Respaldo. Cada fila fantasma fue una salida real que sí ocurrió, pero que nunca se descontó
--      de ningún producto (el producto correcto era otro de esa misma área). Se guardan en una tabla
--      aparte para no perder el rastro mientras se concilia el inventario.
--      Esperado: SELECT 17.
CREATE TABLE movimientos_fantasma_respaldo AS
SELECT m.*
FROM movements m
WHERE m.id IN (100, 102, 107, 121, 140, 142, 156, 174, 179, 182, 183, 189, 229, 235, 238, 279, 282);

--   b) Borrado. Ninguna de estas filas modificó stock (el UPDATE antiguo filtraba por nombre Y área,
--      y ese par no existía), así que NO hay que ajustar stock aquí. La condición NOT EXISTS evita
--      borrar una fila que ya no sea huérfana.
--      Esperado: DELETE 17.
DELETE FROM movements m
WHERE m.id IN (100, 102, 107, 121, 140, 142, 156, 174, 179, 182, 183, 189, 229, 235, 238, 279, 282)
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.name = m.product AND p.area = m.area);

-- PASO 3. El producto 22 de NUCAN se llama 'POOP BAGS (BOLSAS PARA POPIS) ' con espacio al final;
--   su único movimiento (id 23) está guardado sin el espacio. Al recortar el nombre vuelven a coincidir.
--   Esperado: 1 fila afectada.
UPDATE products SET name = btrim(name) WHERE id = 22;

-- PASO 4. Comprobación: ahora la revisión del paso 1 solo debe devolver la id 60.
SELECT m.id, m.area, m.product
FROM movements m
LEFT JOIN products p ON p.name = m.product AND p.area = m.area
WHERE p.id IS NULL
ORDER BY m.id;

-- PASO 5. Movimientos duplicados por doble clic en "Registrar Movimiento" (defecto distinto, ya
--   corregido en el código). Son dos filas idénticas con ids consecutivos y menos de 0,2 s de
--   diferencia. Estas SÍ descontaron stock dos veces, así que al borrar la repetida se devuelve la
--   cantidad al stock.
--   Revisión. Esperado: 4 pares -> 151/152 MASCOTAS, 158/159 PECUARIO, 218/219 NUPEC, 249/250 NUPEC.
SELECT a.id AS id_a, b.id AS id_b, a.area, a.product, a.type, a.qty, a.date, b.date - a.date AS diferencia
FROM movements a
JOIN movements b
  ON b.id = a.id + 1
 AND b.area = a.area AND b.product = a.product AND b.type = a.type AND b.qty = a.qty
WHERE b.date - a.date < interval '2 seconds'
  AND a.date::time <> '00:00:00'      -- excluye las filas cargadas en bloque a medianoche (ids 8/9)
ORDER BY a.id;

--   Corrección (todo o nada). Esperado: UPDATE 4 y DELETE 4.
BEGIN;
UPDATE products p
SET stock = p.stock + CASE WHEN m.type = 'salida' THEN m.qty ELSE -m.qty END
FROM movements m
WHERE m.id IN (152, 159, 219, 250)
  AND p.name = m.product AND p.area = m.area;
DELETE FROM movements WHERE id IN (152, 159, 219, 250);
COMMIT;

-- PASO 6 (opcional, recomendado). Impide crear dos productos con el mismo nombre en la misma área.
--   Hoy no hay duplicados, así que se crea sin problema. El API ya responde 409 con un mensaje claro
--   cuando se intente duplicar. Si ya existiera un constraint o índice con ese nombre, el comando
--   falla con "already exists" y no cambia nada.
ALTER TABLE products ADD CONSTRAINT products_name_area_key UNIQUE (name, area);
