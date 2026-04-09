import { sql } from "@vercel/postgres";

export default async function handler(req, res) {

//   if (req.method === "GET") {

//     const area = req.query.area;

//     const { rows } = await sql`
//       SELECT * FROM movements
//       WHERE area = ${area}
//       ORDER BY id DESC
//     `;

//     return res.json(rows);
//   }

//   if (req.method === "POST") {

//     const { product, qty, type, area } = req.body;

//     await sql`
//       INSERT INTO movements (product, qty, type, area)
//       VALUES (${product}, ${qty}, ${type}, ${area})
//     `;

//     if(type === "entrada"){

//       await sql`
//         UPDATE products
//         SET stock = stock + ${qty}
//         WHERE name = ${product}
//         AND area = ${area}
//       `;

//     } else {

//       await sql`
//         UPDATE products
//         SET stock = stock - ${qty}
//         WHERE name = ${product}
//         AND area = ${area}
//       `;

//     }

//     return res.json({ ok:true });
//   }

}