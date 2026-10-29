import { sql } from '@vercel/postgres';

// Código de Postgres cuando se viola un índice/constraint UNIQUE (nombre repetido en la misma área).
const UNIQUE_VIOLATION = '23505';
const STOCK_MAXIMO = 1000000;

// Devuelve el stock como entero o null si no es válido. Se admiten negativos porque
// ya existen productos con stock negativo y deben poder editarse.
function stockValido(stock) {
  const cantidad = Number(stock);
  if (!Number.isInteger(cantidad) || Math.abs(cantidad) > STOCK_MAXIMO) return null;
  return cantidad;
}

export default async function handler(req, res) {

  // obtener productos por area
  if (req.method === 'GET') {

    const { area } = req.query;

    const { rows } = await sql`
      SELECT *
      FROM products
      WHERE area = ${area}
      ORDER BY id DESC
    `;

    return res.status(200).json(rows);
  }


  // crear producto en el area correcta
  if (req.method === 'POST') {

    const { name, area, stock, comment } = req.body ?? {};
    const nombre = typeof name === 'string' ? name.trim() : '';

    if (!nombre || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({ ok: false, error: 'Faltan el nombre o el área' });
    }

    const cantidad = stockValido(stock ?? 0);
    if (cantidad === null) {
      return res.status(400).json({ ok: false, error: 'El stock debe ser un número entero' });
    }

    try {
      await sql`
        INSERT INTO products (name, area, stock, comment)
        VALUES (${nombre}, ${area}, ${cantidad}, ${comment ?? ''})
      `;
    } catch (err) {
      if (err?.code === UNIQUE_VIOLATION) {
        return res.status(409).json({ ok: false, error: `"${nombre}" ya existe en el área ${area}` });
      }
      throw err;
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PUT') {

    const { id, name, stock } = req.body ?? {};

    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: 'Falta el id del producto' });
    }

    // El nombre no se recorta a propósito: hay productos con espacio al final cuyo
    // historial está guardado con ese mismo nombre.
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ ok: false, error: 'Falta el nombre del producto' });
    }

    const cantidad = stockValido(stock);
    if (cantidad === null) {
      return res.status(400).json({ ok: false, error: 'El stock debe ser un número entero' });
    }

    try {
      await sql`
        UPDATE products
        SET name = ${name}, stock = ${cantidad}
        WHERE id = ${id}
      `;
    } catch (err) {
      if (err?.code === UNIQUE_VIOLATION) {
        return res.status(409).json({ ok: false, error: `Ya existe otro producto llamado "${name}" en esta área` });
      }
      throw err;
    }

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {

    const { id } = req.body ?? {};

    if (!Number.isInteger(id)) {
      return res.status(400).json({ ok: false, error: 'Falta el id del producto' });
    }

    await sql`
      DELETE FROM products
      WHERE id = ${id}
    `;

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
