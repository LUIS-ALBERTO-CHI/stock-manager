import { sql } from '@vercel/postgres';

export default async function handler(req, res) {

  // obtener productos
  if (req.method === 'GET') {

    const { rows } = await sql`
      SELECT * FROM products
      ORDER BY id DESC
    `;

    return res.status(200).json(rows);
  }


  // crear producto
  if (req.method === 'POST') {

    const { name, area, stock, comment } = req.body;

    await sql`
      INSERT INTO products (name, area, stock, comment)
      VALUES (${name}, ${area}, ${stock}, ${comment})
    `;

    return res.status(200).json({ ok:true });
  }

}