import { sql } from "@vercel/postgres";

const TIPOS = ["entrada", "salida"];
const CANTIDAD_MAXIMA = 1000000;

export default async function handler(req, res) {

  if (req.method === "GET") {

    const area = req.query.area;

    const { rows } = await sql`
      SELECT * FROM movements
      WHERE area = ${area}
      ORDER BY id DESC
    `;

    return res.json(rows);
  }

  if (req.method === "POST") {

    const { product, qty, type, area } = req.body ?? {};

    if (typeof product !== "string" || !product.trim() || typeof area !== "string" || !area.trim()) {
      return res.status(400).json({ ok: false, error: "Faltan el producto o el área" });
    }

    if (!TIPOS.includes(type)) {
      return res.status(400).json({ ok: false, error: "Tipo de movimiento inválido" });
    }

    if (!Number.isInteger(qty) || qty <= 0 || qty > CANTIDAD_MAXIMA) {
      return res.status(400).json({ ok: false, error: `La cantidad debe ser un número entero entre 1 y ${CANTIDAD_MAXIMA}` });
    }

    const delta = type === "entrada" ? qty : -qty;

    try {

      // Una sola sentencia atómica: actualiza el stock del producto EN ESA ÁREA
      // (un solo renglón, aunque hubiera nombres repetidos) y, solo si existe
      // ahí, registra el movimiento. Así no puede quedar un movimiento en un
      // área a la que el producto no pertenece, ni un stock modificado sin su
      // movimiento.
      const { rows } = await sql`
        WITH actualizado AS (
          UPDATE products
          SET stock = stock + ${delta}
          WHERE id = (
            SELECT id FROM products
            WHERE name = ${product}
            AND area = ${area}
            ORDER BY id
            LIMIT 1
          )
          RETURNING id
        )
        INSERT INTO movements (product, qty, type, area)
        SELECT ${product}, ${qty}, ${type}, ${area}
        FROM actualizado
        RETURNING id
      `;

      if (rows.length === 0) {
        // code permite al cliente distinguir este caso de un error de validación.
        return res.status(404).json({ ok: false, code: "PRODUCTO_NO_EXISTE", error: `"${product}" no existe en el área ${area}` });
      }

      return res.json({ ok: true, id: rows[0].id });

    } catch (err) {
      console.error("Error al registrar movimiento:", err);
      return res.status(500).json({ ok: false, error: "Error al guardar el movimiento" });
    }
  }

  return res.status(405).json({ ok: false, error: "Método no permitido" });
}
