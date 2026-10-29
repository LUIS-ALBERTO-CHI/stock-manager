// API local en memoria para probar la app sin tocar la base de datos real.
//
//   npm run dev:local
//
// Arranca este servidor en el puerto 3999 y luego Vite; vite.config.js redirige
// /api a este servidor. Al iniciar intenta copiar los datos de producción (solo
// lectura); si no hay internet arranca con datos de ejemplo. Todo lo que
// guardes aquí se pierde al cerrar el proceso.
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = 3999;
const PROD = "https://stock-manager-snowy.vercel.app/api";
const AREAS = ["PECUARIO", "MASCOTAS", "EQUINO GOLD", "NUCAN", "KUBOTA", "NUPEC", "LABORATORIOS", "MATERIAL"];
const TIPOS = ["entrada", "salida"];

let products = [];
let movements = [];

async function cargarDatos() {
  try {
    for (const area of AREAS) {
      products.push(...await (await fetch(`${PROD}/products?area=${encodeURIComponent(area)}`)).json());
      movements.push(...await (await fetch(`${PROD}/movements?area=${encodeURIComponent(area)}`)).json());
    }
    console.log(`Datos copiados de producción: ${products.length} productos, ${movements.length} movimientos`);
  } catch {
    products = [
      { id: 1, name: "Gorras Negras", area: "PECUARIO", stock: 20, comment: "" },
      { id: 2, name: "Bolígrafos blancos", area: "PECUARIO", stock: 3, comment: "Caja 2" },
      { id: 3, name: "BOLIGRAFOS", area: "KUBOTA", stock: 50, comment: "" },
    ];
    movements = [
      { id: 1, product: "Gorras Negras", qty: 5, type: "salida", area: "PECUARIO", date: new Date().toISOString() },
    ];
    console.log("Sin conexión a producción: usando datos de ejemplo");
  }
}

const nextId = (rows) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

function leerBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}

function responder(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// Misma lógica que api/products.js y api/movements.js, pero en memoria.
async function manejar(req, res) {
  const url = new URL(req.url, "http://localhost");
  const recurso = url.pathname.replace(/^\/api\//, "");
  const body = ["POST", "PUT", "DELETE"].includes(req.method) ? await leerBody(req) : {};

  if (recurso === "products") {
    if (req.method === "GET") {
      const area = url.searchParams.get("area");
      return responder(res, 200, products.filter((p) => p.area === area).sort((a, b) => b.id - a.id));
    }
    if (req.method === "POST") {
      const nombre = typeof body.name === "string" ? body.name.trim() : "";
      if (!nombre || !body.area) return responder(res, 400, { ok: false, error: "Faltan el nombre o el área" });
      if (!Number.isInteger(Number(body.stock ?? 0))) return responder(res, 400, { ok: false, error: "El stock debe ser un número entero" });
      if (products.some((p) => p.name === nombre && p.area === body.area)) return responder(res, 409, { ok: false, error: `"${nombre}" ya existe en el área ${body.area}` });
      products.push({ id: nextId(products), name: nombre, area: body.area, stock: Number(body.stock ?? 0), comment: body.comment ?? "" });
      return responder(res, 200, { ok: true });
    }
    if (req.method === "PUT") {
      const p = products.find((x) => x.id === body.id);
      if (!Number.isInteger(body.id)) return responder(res, 400, { ok: false, error: "Falta el id del producto" });
      if (typeof body.name !== "string" || !body.name.trim()) return responder(res, 400, { ok: false, error: "Falta el nombre del producto" });
      if (!Number.isInteger(Number(body.stock))) return responder(res, 400, { ok: false, error: "El stock debe ser un número entero" });
      if (!p) return responder(res, 404, { ok: false, error: "El producto ya no existe" });
      if (products.some((x) => x.id !== p.id && x.name === body.name && x.area === p.area)) return responder(res, 409, { ok: false, error: `Ya existe otro producto llamado "${body.name}" en esta área` });
      if (body.name !== p.name) movements.forEach((m) => { if (m.product === p.name && m.area === p.area) m.product = body.name; });
      Object.assign(p, { name: body.name, stock: Number(body.stock), comment: body.comment ?? "" });
      return responder(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      if (!Number.isInteger(body.id)) return responder(res, 400, { ok: false, error: "Falta el id del producto" });
      products = products.filter((p) => p.id !== body.id);
      return responder(res, 200, { ok: true });
    }
  }

  if (recurso === "movements") {
    if (req.method === "GET") {
      const area = url.searchParams.get("area");
      return responder(res, 200, movements.filter((m) => m.area === area).sort((a, b) => b.id - a.id));
    }
    if (req.method === "POST") {
      const { product, qty, type, area } = body;
      if (typeof product !== "string" || !product.trim() || typeof area !== "string" || !area.trim()) return responder(res, 400, { ok: false, error: "Faltan el producto o el área" });
      if (!TIPOS.includes(type)) return responder(res, 400, { ok: false, error: "Tipo de movimiento inválido" });
      if (!Number.isInteger(qty) || qty <= 0 || qty > 1000000) return responder(res, 400, { ok: false, error: "La cantidad debe ser un número entero entre 1 y 1000000" });
      const p = products.filter((x) => x.name === product && x.area === area).sort((a, b) => a.id - b.id)[0];
      if (!p) return responder(res, 404, { ok: false, code: "PRODUCTO_NO_EXISTE", error: `"${product}" no existe en el área ${area}` });
      p.stock += type === "entrada" ? qty : -qty;
      const id = nextId(movements);
      movements.push({ id, product, qty, type, area, date: new Date().toISOString() });
      return responder(res, 200, { ok: true, id });
    }
  }

  responder(res, 405, { ok: false, error: "Método no permitido" });
}

await cargarDatos();

http.createServer((req, res) => {
  manejar(req, res).catch((err) => { console.error(err); responder(res, 500, { ok: false, error: "Error en el API local" }); });
}).listen(PORT, () => {
  console.log(`API local en http://localhost:${PORT}/api (los cambios no se guardan)`);
  if (process.argv.includes("--with-vite")) {
    const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], { stdio: "inherit" });
    vite.on("exit", () => process.exit(0));
  }
});
