import { useState, useEffect } from "react";

const AREA_ORDER = [
  "PECUARIO",
  "MASCOTAS",
  "EQUINO GOLD",
  "NUCAN",
  "KUBOTA",
  "NUPEC",
  "LABORATORIOS",
  "MATERIAL"
];

export default function StockApp() {
  const API_URL = import.meta.env.VITE_API_URL || "/api";

  const [areas, setAreas] = useState({});
  const [activeArea, setActiveArea] = useState("PECUARIO");
  const [movements, setMovements] = useState([]);

  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("");
  const [type, setType] = useState("entrada");

  const [newProduct, setNewProduct] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [comment, setComment] = useState("");

  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pageProducts, setPageProducts] = useState(1);
  const [pageMovements, setPageMovements] = useState(1);

  const ITEMS_PER_PAGE = 6;

  const products = areas[activeArea] || [];

  const paginatedProducts = products.slice(
    (pageProducts - 1) * ITEMS_PER_PAGE,
    pageProducts * ITEMS_PER_PAGE
  );

  const paginatedMovements = movements.slice(
    (pageMovements - 1) * ITEMS_PER_PAGE,
    pageMovements * ITEMS_PER_PAGE
  );

  const totalProductPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const totalMovementPages = Math.ceil(movements.length / ITEMS_PER_PAGE);

  const notify = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2600);
  };

  const loadProducts = async () => {
    setLoading(true);

    const res = await fetch(`${API_URL}/products?area=${activeArea}`);
    const data = await res.json();

    setAreas(prev => ({
      ...prev,
      [activeArea]: data
    }));

    setLoading(false);
  };

  const loadMovements = async () => {
    const res = await fetch(`${API_URL}/movements?area=${activeArea}`);
    const data = await res.json();

    setMovements(data);
  };

  useEffect(() => {
    loadProducts();
    loadMovements();
  }, [activeArea]);

  const addProduct = async () => {
    if (!newProduct.trim()) {
      notify("Ingresa nombre del producto", "error");
      return;
    }

    await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct,
        stock: Number(initialStock || 0),
        comment,
        area: activeArea
      })
    });

    notify("Producto guardado", "success");

    setNewProduct("");
    setInitialStock("");
    setComment("");

    loadProducts();
  };

  const addMovement = async () => {
    if (!productName || !qty) {
      notify("Selecciona producto y cantidad", "error");
      return;
    }

    await fetch(`${API_URL}/movements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: productName,
        qty: Number(qty),
        type,
        area: activeArea
      })
    });

    notify("Movimiento guardado", "info");

    setQty("");

    loadProducts();
    loadMovements();
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {notification && (
        <div className="fixed right-6 top-20 z-50">
          <div className="backdrop-blur-md bg-white/70 border border-white/40 shadow-xl px-6 py-4 rounded-2xl flex items-center gap-3 min-w-[280px]">
            <div>
              {notification.type === "success" && "✔"}
              {notification.type === "error" && "⚠"}
              {notification.type === "info" && "ℹ"}
            </div>
            <div>{notification.message}</div>
          </div>
        </div>
      )}

      <header className="bg-[#0b4f71] text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold">FOGYSA STOCK</h1>
          <div className="opacity-80 text-sm">Control de inventario</div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {AREA_ORDER.map((area) => (
              <button
                key={area}
                onClick={() => setActiveArea(area)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                  activeArea === area
                    ? "bg-[#4CAF50] text-white"
                    : "bg-white border"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white p-5 rounded-xl shadow space-y-3">
            <h2 className="font-semibold">Nuevo producto</h2>

            <input
              className="border p-2 rounded-lg w-full"
              placeholder="Nombre"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
            />

            <input
              type="number"
              className="border p-2 rounded-lg w-full"
              placeholder="Stock"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
            />

            <textarea
              className="border p-2 rounded-lg w-full"
              placeholder="Nota opcional"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <button
              onClick={addProduct}
              className="bg-[#4CAF50] text-white py-2 rounded-lg w-full"
            >
              Guardar
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow space-y-3">
            <h2 className="font-semibold">Movimiento</h2>

            <select
              className="border p-2 rounded-lg w-full"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            >
              <option value="">Producto</option>
              {products.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </select>

            <input
              type="number"
              className="border p-2 rounded-lg w-full"
              placeholder="Cantidad"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />

            <select
              className="border p-2 rounded-lg w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
            </select>

            <button
              onClick={addMovement}
              className="bg-[#0b4f71] text-white py-2 rounded-lg w-full"
            >
              Guardar movimiento
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="bg-[#0b4f71] text-white px-4 py-2">
            Inventario - {activeArea}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Nota</th>
                <th className="p-3 text-left">Stock</th>
              </tr>
            </thead>

            <tbody>

              {loading && [...Array(4)].map((_, i) => (
                <tr key={i} className="border-t animate-pulse">
                  <td className="p-3"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                  <td className="p-3"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                  <td className="p-3"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                </tr>
              ))}

              {!loading && paginatedProducts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-gray-500">{p.comment || "-"}</td>
                  <td className="p-3 font-semibold">{p.stock}</td>
                </tr>
              ))}

            </tbody>
          </table>

          <div className="flex justify-end gap-2 p-3">
            <button
              disabled={pageProducts === 1}
              onClick={() => setPageProducts(p => p - 1)}
              className="px-3 py-1 border rounded"
            >←</button>

            <span className="text-sm">
              {pageProducts} / {totalProductPages || 1}
            </span>

            <button
              disabled={pageProducts === totalProductPages}
              onClick={() => setPageProducts(p => p + 1)}
              className="px-3 py-1 border rounded"
            >→</button>
          </div>

        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="bg-slate-800 text-white px-4 py-2">
            Historial - {activeArea}
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Cantidad</th>
              </tr>
            </thead>

            <tbody>

              {paginatedMovements.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="p-3">
                    {new Date(m.date).toLocaleDateString("es-MX")}
                  </td>
                  <td className="p-3">{m.product}</td>
                  <td className="p-3">{m.type}</td>
                  <td className="p-3">{m.qty}</td>
                </tr>
              ))}

            </tbody>
          </table>

          <div className="flex justify-end gap-2 p-3">
            <button
              disabled={pageMovements === 1}
              onClick={() => setPageMovements(p => p - 1)}
              className="px-3 py-1 border rounded"
            >←</button>

            <span className="text-sm">
              {pageMovements} / {totalMovementPages || 1}
            </span>

            <button
              disabled={pageMovements === totalMovementPages}
              onClick={() => setPageMovements(p => p + 1)}
              className="px-3 py-1 border rounded"
            >→</button>
          </div>

        </div>

      </main>

    </div>
  );
}
