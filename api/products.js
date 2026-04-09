import { sql } from '@vercel/postgres';

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

    const { name, area, stock, comment } = req.body;

    await sql`
      INSERT INTO products (name, area, stock, comment)
      VALUES (${name}, ${area}, ${stock}, ${comment})
    `;

    return res.status(200).json({ ok:true });
  }

  if (req.method === 'PUT') {

  const { id, name } = req.body;

  await sql`
    UPDATE products
    SET name = ${name}
    WHERE id = ${id}
  `;

  return res.status(200).json({ ok:true });
}

}