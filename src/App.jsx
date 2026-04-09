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

const AREA_COLORS = {
  "PECUARIO": "bg-green-800",
  "MASCOTAS": "bg-blue-900",
  "EQUINO GOLD": "bg-amber-900", // El ámbar 900 de Tailwind es color café
  "NUCAN": "bg-purple-700",
  "KUBOTA": "bg-orange-600",
  "NUPEC": "bg-sky-500", // Azul claro
  "LABORATORIOS": "bg-yellow-500",
  "MATERIAL": "bg-pink-500"
};

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

  const exportExcel = async () => {
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();

  for (const area of AREA_ORDER) {

    const resProducts = await fetch(`${API_URL}/products?area=${area}`);
    const products = await resProducts.json();

    const resMovements = await fetch(`${API_URL}/movements?area=${area}`);
    const movements = await resMovements.json();

    const sheet = workbook.addWorksheet(area);

    // =========================
    // INVENTARIO (TABLA VERDE)
    // =========================

    sheet.mergeCells("A3:A" + (3 + products.length));
    const areaCell = sheet.getCell("A3");
    areaCell.value = area;
    areaCell.alignment = { vertical: "middle", horizontal: "center" };
    areaCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "A9D08E" } // verde
    };
    areaCell.font = { bold: true };

    // headers
    sheet.getCell("B3").value = "MATERIAL";
    sheet.getCell("C3").value = "STOCK";

    ["B3", "C3"].forEach(cell => {
      sheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "A9D08E" }
      };
      sheet.getCell(cell).font = { bold: true };
      sheet.getCell(cell).border = borderStyle;
    });

    // productos
    products.forEach((p, i) => {
      const row = sheet.getRow(4 + i);

      row.getCell(2).value = p.name;
      row.getCell(3).value = p.stock;

      row.eachCell(cell => {
        cell.border = borderStyle;
      });
    });

    // =========================
    // SALIDAS (TABLA MORADA)
    // =========================

    const startMov = 5 + products.length;

    sheet.mergeCells(`A${startMov}:A${startMov + movements.length}`);
    const movTitle = sheet.getCell(`A${startMov}`);
    movTitle.value = "SALIDAS";
    movTitle.alignment = { vertical: "middle", horizontal: "center" };
    movTitle.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9B3FF" } // morado
    };
    movTitle.font = { bold: true };

    // headers
    sheet.getCell(`B${startMov}`).value = "FECHA";
    sheet.getCell(`C${startMov}`).value = "CODIGO";
    sheet.getCell(`D${startMov}`).value = "CANTIDAD";

    [`B${startMov}`, `C${startMov}`, `D${startMov}`].forEach(cell => {
      sheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9B3FF" }
      };
      sheet.getCell(cell).font = { bold: true };
      sheet.getCell(cell).border = borderStyle;
    });

    // movimientos
    movements.forEach((m, i) => {
      const row = sheet.getRow(startMov + 1 + i);

      row.getCell(2).value = new Date(m.date).toLocaleDateString("es-MX");
      row.getCell(3).value = m.product;
      row.getCell(4).value = m.qty;

      row.eachCell(cell => {
        cell.border = borderStyle;
      });
    });

    // ancho columnas
    sheet.columns = [
      { width: 15 },
      { width: 40 },
      { width: 15 },
      { width: 15 }
    ];
  }

  // descargar
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fogysa-stock.xlsx";
  a.click();
};

const borderStyle = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" }
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

  const saveEdit = async (id) => {
    await fetch(`${API_URL}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName, stock: Number(editStockValue) })
    });

    setEditingId(null);
    notify("Producto actualizado", "success");
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

      <div className="max-w-7xl mx-auto px-6 pt-4">
<button
onClick={exportExcel}
className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow flex items-center gap-2"
>
📥 Exportar Excel
</button>
</div>

      <main className="p-6 max-w-7xl mx-auto space-y-6">

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {AREA_ORDER.map((area) => (
              <button
                key={area}
                onClick={() => setActiveArea(area)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeArea === area
                    ? `${AREA_COLORS[area]} text-white`
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

          <div className={`${AREA_COLORS[activeArea]} transition-colors text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
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
                <th className="p-3 text-center">Acciones</th>
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
                <tr key={p.id} className="border-t hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    {editingId === p.id ? (
                      <input className="border border-blue-400 rounded px-2 py-1 w-full sm:w-auto text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={editName} onChange={e=>setEditName(e.target.value)}/>
                    ) : (
                      <span className="font-medium text-gray-800">{p.name}</span>
                    )}
                  </td>

                  <td className="p-3 text-gray-500">{p.comment||"-"}</td>

                  <td className="p-3">
                    {editingId === p.id ? (
                      <input type="number" className="border border-blue-400 rounded px-2 py-1 w-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={editStockValue} onChange={e=>setEditStockValue(e.target.value)}/>
                    ) : (
                      <span className="font-semibold">{p.stock}</span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-3">
                    {editingId === p.id ? (
                      <>
                        <button onClick={() => saveEdit(p.id)} className="text-green-600 hover:text-green-800 flex items-center gap-1 transition-colors" title="Guardar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors" title="Cancelar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(p.id); setEditName(p.name); setEditStockValue(p.stock); }} className="text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </button>
                        <button onClick={()=>setConfirmModal(p.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </>
                    )}
                    </div>
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

          <div className={`${AREA_COLORS[activeArea]} transition-colors text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
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

              {(filterProduct || filterDate) && (
                <button
                  onClick={() => {
                    setFilterProduct("");
                    setFilterDate("");
                    setPageMovements(1);
                  }}
                  className="text-white bg-slate-700 hover:bg-slate-600 text-sm px-3 py-1.5 rounded-lg border border-slate-600 transition-colors w-full sm:w-auto flex justify-center items-center gap-1"
                  title="Borrar filtros"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  Limpiar
                </button>
              )}
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
