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

const initialData = {
  PECUARIO: [],
  MASCOTAS: [],
  "EQUINO GOLD": [],
  NUCAN: [],
  KUBOTA: [],
  NUPEC: [],
  LABORATORIOS: [],
  MATERIAL: []
};

export default function StockApp() {
  const [areas, setAreas] = useState(initialData);
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

  const products = areas[activeArea] || [];

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(()=>setLoading(false),600);
    return ()=>clearTimeout(t);
  },[activeArea]);

  const notify = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2600);
  };

  const addProduct = () => {
    if (!newProduct.trim()) {
      notify("Ingresa nombre del producto", "error");
      return;
    }

    const normalizedName = newProduct.trim().toLowerCase();

    const existingProduct = products.find(
      (p) => p.name.toLowerCase() === normalizedName
    );

    let updatedProducts;

    if (existingProduct) {
      updatedProducts = products.map((p) =>
        p.id === existingProduct.id
          ? { ...p, stock: p.stock + Number(initialStock || 0) }
          : p
      );

      notify("Stock actualizado", "success");
    } else {
      updatedProducts = [
        ...products,
        {
          id: Date.now(),
          name: newProduct.trim(),
          stock: Number(initialStock || 0),
          comment: comment || ""
        }
      ];

      notify("Producto creado", "success");
    }

    setAreas({ ...areas, [activeArea]: updatedProducts });

    setNewProduct("");
    setInitialStock("");
    setComment("");
  };

  const addMovement = () => {
    if (!productName || !qty) {
      notify("Selecciona producto y cantidad", "error");
      return;
    }

    const product = products.find((p) => p.name === productName);

    if (type === "salida" && product?.stock < Number(qty)) {
      notify("Stock insuficiente", "error");
      return;
    }

    const updatedProducts = products.map((p) => {
      if (p.name === productName) {
        const newStock =
          type === "entrada"
            ? p.stock + Number(qty)
            : p.stock - Number(qty);

        return { ...p, stock: newStock };
      }
      return p;
    });

    setAreas({ ...areas, [activeArea]: updatedProducts });

    setMovements([
      ...movements,
      {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        product: productName,
        qty: Number(qty),
        type,
        area: activeArea
      }
    ]);

    notify("Movimiento guardado", "info");

    setQty("");
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {notification && (
        <div className="fixed right-6 top-20 z-50">
          <div className="backdrop-blur-md bg-white/70 border border-white/40 shadow-xl px-6 py-4 rounded-2xl flex items-center gap-3 min-w-[280px] text-slate-800">

            <div className={`text-xl
              ${notification.type === "success" ? "text-green-600" : ""}
              ${notification.type === "error" ? "text-red-600" : ""}
              ${notification.type === "info" ? "text-blue-600" : ""}`}>

              {notification.type === "success" && "✔"}
              {notification.type === "error" && "⚠"}
              {notification.type === "info" && "ℹ"}

            </div>

            <div className="font-medium">
              {notification.message}
            </div>

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

        {/* AREAS SCROLL */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">

            {AREA_ORDER.map((area) => (
              <button
                key={area}
                onClick={() => setActiveArea(area)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition
                ${activeArea === area
                  ? "bg-[#4CAF50] text-white"
                  : "bg-white border"}`}
              >
                {area}
              </button>
            ))}

          </div>
        </div>


        {/* FORMS */}
        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white p-5 rounded-xl shadow space-y-3">
            <h2 className="font-semibold">Nuevo producto</h2>

            <input
              className="border p-2 rounded-lg w-full"
              placeholder="Ej: Playera negra"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
            />

            <input
              type="number"
              className="border p-2 rounded-lg w-full"
              placeholder="Stock inicial"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
            />

            <textarea
              className="border p-2 rounded-lg w-full resize-none"
              placeholder="Comentario (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />

            <button
              onClick={addProduct}
              className="bg-[#4CAF50] text-white py-2 rounded-lg w-full"
            >
              Guardar producto
            </button>

          </div>


          <div className="bg-white p-5 rounded-xl shadow space-y-3">

            <h2 className="font-semibold">Movimiento</h2>

            <select
              className="border p-2 rounded-lg w-full"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            >
              <option value="">Seleccionar producto</option>

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


        {/* INVENTORY */}
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

              {loading && [...Array(4)].map((_,i)=>(
                <tr key={i} className="border-t animate-pulse">
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="p-3">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                </tr>
              ))}

              {!loading && products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-gray-500 text-sm">{p.comment || "—"}</td>
                  <td className="p-3 font-semibold">{p.stock}</td>
                </tr>
              ))}

              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-gray-400">
                    Sin productos
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>


        {/* HISTORY */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="bg-slate-800 text-white px-4 py-2">
            Historial - {activeArea}
          </div>

          <table className="w-full text-sm">

            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Cantidad</th>
              </tr>
            </thead>

            <tbody>

              {movements
                .filter((m) => m.area === activeArea)
                .map((m) => (

                  <tr key={m.id} className="border-t">

                    <td className="p-3">{m.date}</td>

                    <td className="p-3">{m.product}</td>

                    <td className="p-3">

                      <span className={`px-2 py-1 rounded text-xs
                        ${m.type === "entrada"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"}`}>

                        {m.type}

                      </span>

                    </td>

                    <td className="p-3">{m.qty}</td>

                  </tr>

                ))}


              {movements.filter(m => m.area === activeArea).length === 0 && (

                <tr>

                  <td colSpan="4" className="p-6 text-center text-gray-400">
                    Sin movimientos
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </main>

    </div>
  );
}
