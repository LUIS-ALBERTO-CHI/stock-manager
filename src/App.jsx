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

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const [pageProducts, setPageProducts] = useState(1);
  const [pageMovements, setPageMovements] = useState(1);

  const [filterProduct, setFilterProduct] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [editStockId, setEditStockId] = useState(null);
  const [editStockValue, setEditStockValue] = useState("");

  const [confirmModal, setConfirmModal] = useState(null);

  const ITEMS_PER_PAGE = 6;

  const products = areas[activeArea] || [];

  const searchedProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedProducts = searchedProducts.slice(
    (pageProducts - 1) * ITEMS_PER_PAGE,
    pageProducts * ITEMS_PER_PAGE
  );

  const filteredMovements = movements.filter(m=>{
  const matchProduct = filterProduct ? m.product===filterProduct : true;
  const matchDate = filterDate ? m.date?.startsWith(filterDate) : true;
  return matchProduct && matchDate;
});

const paginatedMovements = filteredMovements.slice(
  (pageMovements - 1) * ITEMS_PER_PAGE,
  pageMovements * ITEMS_PER_PAGE
);

  const totalProductPages = Math.ceil(searchedProducts.length / ITEMS_PER_PAGE);
  const totalMovementPages = Math.ceil(filteredMovements.length / ITEMS_PER_PAGE);

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

  const updateProductName = async (id) => {
  await fetch(`${API_URL}/products`,{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id,name:editName})
  });

  setEditingId(null);
  notify("Nombre actualizado","success");
  loadProducts();
};

const updateStock = async(id)=>{
  await fetch(`${API_URL}/products`,{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id,stock:Number(editStockValue)})
  });

  setEditStockId(null);
  notify("Stock actualizado","success");
  loadProducts();
};

const deleteProduct = async(id)=>{
  await fetch(`${API_URL}/products`,{
    method:"DELETE",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id})
  });

  notify("Producto eliminado","success");
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

          <div className="bg-[#0b4f71] text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="font-semibold">Inventario - {activeArea}</span>
            <input
              type="text"
              placeholder="🔍 Buscar producto..."
              className="text-black text-sm px-4 py-1.5 rounded-full w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={searchQuery}
              onChange={(e) => {setSearchQuery(e.target.value); setPageProducts(1);}}
            />
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Nota</th>
                <th className="p-3 text-left">Stock</th>
<th className="p-3">Acciones</th>
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

              {!loading && paginatedProducts.map((p)=>(
<tr key={p.id} className="border-t">
<td className="p-3 flex items-center gap-2">
{editingId===p.id ? (
<>
<input className="border rounded px-2 py-1" value={editName} onChange={e=>setEditName(e.target.value)}/>
<button onClick={()=>updateProductName(p.id)}>✔</button>
</>
):(
<>
<span>{p.name}</span>
<button onClick={()=>{setEditingId(p.id);setEditName(p.name)}}>✏</button>
</>
)}
</td>

<td className="p-3 text-gray-500">{p.comment||"-"}</td>

<td className="p-3">
{editStockId===p.id?(
<>
<input type="number" className="border w-20" value={editStockValue} onChange={e=>setEditStockValue(e.target.value)}/>
<button onClick={()=>updateStock(p.id)}>✔</button>
</>
):(
<div className="flex items-center gap-2">
<span>{p.stock}</span>
<button onClick={()=>{setEditStockId(p.id);setEditStockValue(p.stock)}}>✏</button>
</div>
)}
</td>

<td className="p-3">
<button onClick={()=>setConfirmModal(p.id)} className="text-red-500">🗑</button>
</td>
</tr>
))}

            </tbody>
          </table>

          <div className="flex flex-col items-center gap-2 py-4 border-t bg-slate-50">

            <div className="text-xs text-slate-500">
              Total productos: {searchedProducts.length}
            </div>

            <div className="flex items-center gap-2 bg-white border rounded-full px-4 py-2 shadow-sm">

              <button
                onClick={() => setPageProducts(p => Math.max(p - 1, 1))}
                className="px-2 text-slate-500 hover:text-black"
              >
                ‹
              </button>

              {[...Array(totalProductPages || 1)].map((_, i) => {
                const page = i + 1;
                const active = page === pageProducts;

                if (
                  totalProductPages > 7 &&
                  page > 3 &&
                  page < totalProductPages - 2 &&
                  Math.abs(pageProducts - page) > 1
                ) {
                  if (page === 4) return <span key={page}>...</span>;
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setPageProducts(page)}
                    className={`w-8 h-8 text-sm rounded-full ${
                      active
                        ? "bg-indigo-100 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setPageProducts(p => Math.min(p + 1, totalProductPages))
                }
                className="px-2 text-slate-500 hover:text-black"
              >
                ›
              </button>

            </div>

          </div>

        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="bg-slate-800 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="font-semibold">Historial - {activeArea}</span>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select 
                className="text-black text-sm px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full sm:w-48" 
                value={filterProduct} 
                onChange={e => {setFilterProduct(e.target.value); setPageMovements(1);}}
              >
                <option value="">Todos los productos</option>
                {products.map(p=><option key={p.id}>{p.name}</option>)}
              </select>

              <input 
                type="date" 
                className="text-black text-sm px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full sm:w-auto" 
                value={filterDate} 
                onChange={e => {setFilterDate(e.target.value); setPageMovements(1);}}
              />
            </div>
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

              {paginatedMovements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3">
                    {new Date(m.date).toLocaleDateString("es-MX")}
                  </td>
                  <td className="p-3">{m.product}</td>
                  <td className="p-3">
<span className={`px-2 py-1 rounded-full text-xs ${m.type==='entrada'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
{m.type}
</span>
</td>
                  <td className="p-3">{m.qty}</td>
                </tr>
              ))}

            </tbody>
          </table>

          <div className="flex justify-center py-4 border-t bg-slate-50">

            <div className="flex items-center gap-2 bg-white border rounded-full px-4 py-2 shadow-sm">

              <button
                onClick={() => setPageMovements(p => Math.max(p - 1, 1))}
                className="px-2 text-slate-500 hover:text-black"
              >
                ‹
              </button>

              {[...Array(totalMovementPages || 1)].map((_, i) => {
                const page = i + 1;
                const active = page === pageMovements;

                if (
                  totalMovementPages > 7 &&
                  page > 3 &&
                  page < totalMovementPages - 2 &&
                  Math.abs(pageMovements - page) > 1
                ) {
                  if (page === 4) return <span key={page}>...</span>;
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setPageMovements(page)}
                    className={`w-8 h-8 text-sm rounded-full ${
                      active
                        ? "bg-indigo-100 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setPageMovements(p => Math.min(p + 1, totalMovementPages))
                }
                className="px-2 text-slate-500 hover:text-black"
              >
                ›
              </button>

            </div>

          </div>

        </div>

      {confirmModal && (
<div className="fixed inset-0 bg-black/40 flex items-center justify-center">
<div className="bg-white p-6 rounded-xl shadow space-y-3">
<div>Eliminar producto?</div>
<div className="flex gap-2">
<button className="bg-red-500 text-white px-3 py-1 rounded" onClick={()=>{deleteProduct(confirmModal);setConfirmModal(null)}}>
Eliminar
</button>
<button className="border px-3 py-1 rounded" onClick={()=>setConfirmModal(null)}>
Cancelar
</button>
</div>
</div>
</div>
)}

</main>

    </div>
  );
}
