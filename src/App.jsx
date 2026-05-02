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
  "EQUINO GOLD": "bg-amber-900",
  "NUCAN": "bg-purple-700",
  "KUBOTA": "bg-orange-600",
  "NUPEC": "bg-sky-500",
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

  // UI State for new design
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "history"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("product"); // "product" | "movement"
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

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
    setIsModalOpen(false);

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
    setIsModalOpen(false);

    loadProducts();
    loadMovements();
  };

  const handleFabClick = (e) => {
    // Efecto Ripple
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const circle = document.createElement("span");
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add("ripple-element");

    const existingRipple = button.querySelector(".ripple-element");
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(circle);
    setTimeout(() => { if (circle.parentNode === button) circle.remove(); }, 600);

    // Lógica del modal
    setModalType(activeTab === "history" ? "movement" : "product");
    setIsModalOpen(false); // reset state to allow animation
    setTimeout(() => setIsModalOpen(true), 10);
  };

  return (
    <div className={`min-h-screen bg-[#f6fafe] text-[#171c1f] font-sans antialiased pb-24 md:pb-0 transition-all duration-300 ${isSidebarExpanded ? 'md:pl-80' : 'md:pl-20'}`}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
          -webkit-tap-highlight-color: transparent !important;
        }

        body { 
          font-family: 'Inter', sans-serif; 
          -webkit-touch-callout: none;
        }
        
        .material-symbols-outlined { 
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24 !important; 
          display: inline-block !important;
          overflow: hidden !important;
          vertical-align: middle !important;
          line-height: 1 !important;
          width: 1em !important;
          height: 1em !important;
          white-space: nowrap !important;
          word-wrap: normal !important;
          direction: ltr !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          user-select: none !important;
          pointer-events: none !important;
          -webkit-touch-callout: none !important;
          transform: translateZ(0);
        }
        
        /* Animación Ripple */
        .ripple-element {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple-animation 600ms linear;
          background-color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        /* Animación para el cambio de pestañas */
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .icon-fill { font-variation-settings: 'FILL' 1; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {notification && (
        <div className="fixed right-6 top-20 z-[100] animate-pulse">
          <div className={`shadow-lg px-6 py-4 rounded-xl flex items-center gap-3 min-w-[280px] font-medium ${
            notification.type === "success" ? "bg-[#a6f4b5] text-[#00210b] border border-[#78dc77]" : 
            notification.type === "error" ? "bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a]" : 
            "bg-[#c9e6ff] text-[#001e2f] border border-[#97cdf4]"
          }`}>
            <span className="material-symbols-outlined">
              {notification.type === "success" ? "check_circle" : notification.type === "error" ? "error" : "info"}
            </span>
            <div>{notification.message}</div>
          </div>
        </div>
      )}

      {/* TopAppBar (Web & Mobile Header) */}
      <header className={`fixed top-0 left-0 right-0 z-40 bg-[#ffffff] shadow-sm flex justify-between items-center px-4 py-3 h-16 border-b border-[#c1c7ce] transition-all duration-300 ${isSidebarExpanded ? 'md:left-80' : 'md:left-20'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="hidden md:flex items-center justify-center text-[#0b4f71] p-1 hover:bg-[#eaeef2] rounded-full transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-[20px] md:text-[24px] font-bold text-[#0b4f71] tracking-tight">Fogysa Stock</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={exportExcel} title="Exportar a Excel" className="text-[#0b4f71] p-2 hover:bg-[#eaeef2] rounded-full transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="hidden sm:inline text-[13px] font-semibold">Exportar</span>
          </button>
        </div>
      </header>

      {/* SideNav (Desktop) */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-[#ffffff] border-r border-[#c1c7ce] z-50 transition-all duration-300 ${isSidebarExpanded ? 'w-80' : 'w-20'}`}>
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
          <button onClick={() => setActiveTab("catalog")} className={`flex items-center py-3 rounded-lg font-semibold transition-all duration-300 ${isSidebarExpanded ? 'px-4 justify-start' : 'px-0 justify-center'} ${activeTab === "catalog" ? "bg-[#0b4f71] text-[#8bc0e7]" : "text-[#41484e] hover:bg-[#eaeef2] hover:text-[#003752]"}`}>
            <span className={`material-symbols-outlined ${activeTab === "catalog" ? "icon-fill" : ""}`}>inventory_2</span>
            <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarExpanded ? 'max-w-[200px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'}`}>
              Catálogo
            </span>
          </button>
          <button onClick={() => setActiveTab("history")} className={`flex items-center py-3 rounded-lg font-semibold transition-all duration-300 ${isSidebarExpanded ? 'px-4 justify-start' : 'px-0 justify-center'} ${activeTab === "history" ? "bg-[#0b4f71] text-[#8bc0e7]" : "text-[#41484e] hover:bg-[#eaeef2] hover:text-[#003752]"}`}>
            <span className={`material-symbols-outlined ${activeTab === "history" ? "icon-fill" : ""}`}>history</span>
            <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarExpanded ? 'max-w-[200px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'}`}>
              Historial
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content Canvas */}
      <main className="pt-20 px-4 md:px-6 max-w-7xl mx-auto w-full">

        {/* Top Controls: Search & Chips */}
        <div className="flex flex-col gap-4 mb-6">
          {activeTab === "catalog" && (
            <div className="relative w-full shadow-sm rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#71787e] text-[20px]">search</span>
              </div>
              <input className="w-full pl-12 pr-4 py-3 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] placeholder-[#71787e] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent text-[14px] transition-shadow" placeholder="Buscar inventario..." type="text" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setPageProducts(1);}} />
            </div>
          )}

          {/* Category Chips */}
          <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 scrollbar-hide">
            {AREA_ORDER.map((area) => (
              <button
                key={area}
                onClick={() => setActiveArea(area)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm ${
                  activeArea === area 
                    ? `${AREA_COLORS[area]} text-white border border-transparent` 
                    : 'bg-[#ffffff] border border-[#c1c7ce] text-[#171c1f] hover:bg-[#eaeef2]'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog View */}
        {activeTab === "catalog" && (
          <div className="space-y-4 animate-fade-in">
            {/* Mobile View (Cards) */}
            <div className="md:hidden flex flex-col gap-3">
              {!loading && paginatedProducts.map(p => (
                <div key={p.id} className="bg-[#ffffff] p-4 rounded-xl border border-[#c1c7ce] shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.stock < 5 ? 'bg-[#ba1a1a]' : 'bg-[#1f6c3a]'}`}></div>
                  <div className="flex justify-between items-start pl-2">
                    <div className="w-[70%]">
                      <span className={`text-[10px] font-bold text-[#ffffff] tracking-wider uppercase mb-1 inline-block px-2 py-0.5 rounded-sm transition-colors ${AREA_COLORS[activeArea] || 'bg-[#71787e]'}`}>{activeArea}</span>
                      <h3 className="text-[16px] font-semibold text-[#171c1f] leading-tight break-words">{p.name}</h3>
                      {p.comment && <p className="text-[12px] text-[#71787e] mt-1">{p.comment}</p>}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[24px] font-bold ${p.stock < 5 ? 'text-[#ba1a1a]' : 'text-[#1f6c3a]'}`}>{p.stock}</span>
                      <span className="text-[12px] text-[#71787e]">Unds</span>
                    </div>
                  </div>
                  
                  {editingId === p.id ? (
                    <div className="pl-2 border-t border-[#c1c7ce] pt-3 flex flex-col gap-2">
                      <input value={editName} onChange={e=>setEditName(e.target.value)} className="border border-[#c1c7ce] rounded p-2 text-[14px]" placeholder="Nombre..." />
                      <input type="number" value={editStockValue} onChange={e=>setEditStockValue(e.target.value)} className="border border-[#c1c7ce] rounded p-2 text-[14px] w-full" placeholder="Stock" />
                      <div className="flex gap-2 justify-end mt-1">
                        <button onClick={() => setEditingId(null)} className="text-[#41484e] bg-[#eaeef2] px-3 py-1.5 rounded-lg text-[13px] font-bold">Cancelar</button>
                        <button onClick={() => saveEdit(p.id)} className="text-[#ffffff] bg-[#1f6c3a] px-3 py-1.5 rounded-lg text-[13px] font-bold">Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center mt-2 pl-2 border-t border-[#c1c7ce] pt-3">
                      {p.stock < 5 ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#93000a] bg-[#ffdad6] px-2 py-1 rounded-md">
                          <span className="material-symbols-outlined text-[14px]">warning</span> Crítico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#005226] bg-[#a6f4b5] px-2 py-1 rounded-md">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> En Stock
                        </span>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(p.id); setEditName(p.name); setEditStockValue(p.stock); }} className="p-1.5 text-[#71787e] hover:text-[#0b4f71] bg-[#eaeef2] rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => setConfirmModal(p.id)} className="p-1.5 text-[#71787e] hover:text-[#ba1a1a] bg-[#eaeef2] rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View (Data Table) */}
            <div className="hidden md:block bg-[#ffffff] rounded-xl border border-[#c1c7ce] shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`${AREA_COLORS[activeArea] || 'bg-[#003d0c]'} text-[#ffffff] border-b border-[#c1c7ce] transition-colors`}>
                    <th className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider w-[10%]">Estado</th>
                    <th className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider w-[40%]">Producto</th>
                    <th className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider w-[20%]">Nota</th>
                    <th className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider text-right w-[15%]">Stock</th>
                    <th className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider text-right w-[15%]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c1c7ce]">
                  {loading && [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 px-4"><div className="w-3 h-3 bg-gray-300 rounded-full"></div></td>
                      <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                      <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="py-3 px-4 flex justify-end"><div className="h-4 bg-gray-200 rounded w-8"></div></td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  ))}
                  {!loading && paginatedProducts.map(p => (
                    <tr key={p.id} className={`transition-colors ${p.stock < 5 ? 'bg-[#f0f4f8]' : 'bg-[#ffffff]'} hover:bg-[#eaeef2]`}>
                      <td className="py-3 px-4">
                        <span className={`w-3 h-3 rounded-full inline-block shadow-sm ${p.stock < 5 ? 'bg-[#ba1a1a] animate-pulse' : 'bg-[#1f6c3a]'}`}></span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#171c1f]">
                        {editingId === p.id ? <input className="border border-[#c1c7ce] px-2 py-1 rounded w-full text-[14px]" value={editName} onChange={e=>setEditName(e.target.value)}/> : p.name}
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#41484e]">{p.comment || "-"}</td>
                      <td className={`py-3 px-4 text-right font-bold ${p.stock < 5 ? 'text-[#ba1a1a]' : 'text-[#1f6c3a]'}`}>
                        {editingId === p.id ? <input type="number" className="border border-[#c1c7ce] px-2 py-1 rounded w-20 text-[14px]" value={editStockValue} onChange={e=>setEditStockValue(e.target.value)}/> : p.stock}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingId === p.id ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => saveEdit(p.id)} className="text-[#1f6c3a] hover:text-[#005226] p-1"><span className="material-symbols-outlined">save</span></button>
                            <button onClick={() => setEditingId(null)} className="text-[#71787e] hover:text-[#171c1f] p-1"><span className="material-symbols-outlined">close</span></button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingId(p.id); setEditName(p.name); setEditStockValue(p.stock); }} className="text-[#71787e] hover:text-[#0b4f71] p-1 transition-colors"><span className="material-symbols-outlined">edit</span></button>
                            <button onClick={() => setConfirmModal(p.id)} className="text-[#71787e] hover:text-[#ba1a1a] p-1 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 py-4">
              <button onClick={() => setPageProducts(p => Math.max(p - 1, 1))} className="p-2 text-[#71787e] hover:text-[#171c1f] hover:bg-[#eaeef2] rounded-full transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
              <span className="text-[14px] font-semibold text-[#41484e]">Página {pageProducts} de {totalProductPages || 1}</span>
              <button onClick={() => setPageProducts(p => Math.min(p + 1, totalProductPages))} className="p-2 text-[#71787e] hover:text-[#171c1f] hover:bg-[#eaeef2] rounded-full transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </div>
        )}

        {/* History View */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-fade-in">
            {/* Filters for History */}
            <div className="flex flex-col sm:flex-row gap-3 w-full bg-[#ffffff] p-4 rounded-xl shadow-sm border border-[#c1c7ce]">
              <select 
                className="px-3 py-2 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] focus:outline-none focus:ring-2 focus:ring-[#003752] text-[14px] w-full sm:w-64" 
                value={filterProduct} 
                onChange={e => {setFilterProduct(e.target.value); setPageMovements(1);}}
              >
                <option value="">Filtrar por producto...</option>
                {products.map(p=><option key={p.id}>{p.name}</option>)}
              </select>

              <input 
                type="date" 
                className="px-3 py-2 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] focus:outline-none focus:ring-2 focus:ring-[#003752] text-[14px] w-full sm:w-auto" 
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
                  className="text-[#0b4f71] bg-[#c9e6ff] hover:bg-[#97cdf4] px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-[14px] w-full sm:w-auto"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Transaction List (Unified Responsive View) */}
            <div className="flex flex-col gap-3">
              {paginatedMovements.map(m => (
                <div key={m.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#ffffff] rounded-xl border border-[#c1c7ce] hover:border-[#97cdf4] shadow-sm transition-all">
                  <div className="flex items-center gap-4 w-full sm:w-auto mb-3 sm:mb-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${m.type === 'entrada' ? 'bg-[#a4f1b2] text-[#24703e]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                      <span className="material-symbols-outlined icon-fill text-[24px]">
                        {m.type === 'entrada' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-[#171c1f] leading-tight break-words">{m.product}</div>
                      <div className="text-[13px] text-[#41484e] flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span> {new Date(m.date).toLocaleDateString("es-MX")}
                        <span className="w-1 h-1 bg-[#c1c7ce] rounded-full"></span>
                        <span className="material-symbols-outlined text-[16px]">inventory_2</span> {activeArea}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 border-t sm:border-t-0 border-[#c1c7ce]/50 pt-3 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <div className={`text-[12px] font-bold tracking-wider uppercase mb-1 ${m.type === 'entrada' ? 'text-[#1f6c3a]' : 'text-[#ba1a1a]'}`}>
                        {m.type}
                      </div>
                      <div className={`text-[20px] font-bold ${m.type === 'entrada' ? 'text-[#1f6c3a]' : 'text-[#171c1f]'}`}>
                        {m.type === 'entrada' ? '+' : '-'} {m.qty} Unds
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {paginatedMovements.length === 0 && !loading && (
                <div className="text-center py-8 text-[#71787e] text-[14px]">No hay movimientos registrados.</div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 py-4">
              <button onClick={() => setPageMovements(p => Math.max(p - 1, 1))} className="p-2 text-[#71787e] hover:text-[#171c1f] hover:bg-[#eaeef2] rounded-full transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
              <span className="text-[14px] font-semibold text-[#41484e]">Página {pageMovements} de {totalMovementPages || 1}</span>
              <button onClick={() => setPageMovements(p => Math.min(p + 1, totalMovementPages))} className="p-2 text-[#71787e] hover:text-[#171c1f] hover:bg-[#eaeef2] rounded-full transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <button onClick={handleFabClick} aria-label="Añadir" className="fixed overflow-hidden right-6 bottom-24 md:bottom-8 z-50 w-14 h-14 bg-[#003752] text-[#ffffff] rounded-xl shadow-[0_4px_12px_rgba(11,79,113,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center py-2 bg-[#ffffff] z-40 border-t border-[#c1c7ce] shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
        <button onClick={() => setActiveTab("catalog")} className={`flex flex-col items-center justify-center px-4 py-1.5 transition-transform duration-100 ${activeTab === "catalog" ? "text-[#0b4f71] bg-[#c9e6ff] rounded-lg" : "text-[#71787e]"}`}>
          <span className={`material-symbols-outlined mb-0.5 ${activeTab === "catalog" ? "icon-fill" : ""}`}>inventory_2</span>
          <span className="text-[10px] font-medium tracking-wide">Catálogo</span>
        </button>
        <button onClick={() => setActiveTab("history")} className={`flex flex-col items-center justify-center px-4 py-1.5 transition-transform duration-100 ${activeTab === "history" ? "text-[#0b4f71] bg-[#c9e6ff] rounded-lg" : "text-[#71787e]"}`}>
          <span className={`material-symbols-outlined mb-0.5 ${activeTab === "history" ? "icon-fill" : ""}`}>history</span>
          <span className="text-[10px] font-medium tracking-wide">Historial</span>
        </button>
      </nav>

      {/* Add / Move Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={(e) => {if(e.target === e.currentTarget) setIsModalOpen(false)}}>
          <div className="bg-[#f6fafe] rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col animate-fade-in-up max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#c1c7ce]/50 flex justify-between items-center bg-[#ffffff] shadow-sm z-10">
              <h2 className="text-[18px] font-bold text-[#0b4f71] flex items-center gap-2 tracking-tight">
                <span className="material-symbols-outlined">{modalType === "product" ? "add_box" : "swap_horiz"}</span>
                {modalType === "product" ? "Nuevo Producto" : "Nuevo Movimiento"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#0b4f71] hover:text-[#ba1a1a] p-1.5 rounded-full hover:bg-[#eaeef2] transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {modalType === "product" ? (
                <>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Nombre del producto</label>
                    <input value={newProduct} onChange={e => setNewProduct(e.target.value)} className="block w-full py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[14px]" placeholder="Ej. Alimento Premium..." />
                  </div>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Stock Inicial</label>
                    <div className="relative">
                      <input type="number" value={initialStock} onChange={e => setInitialStock(e.target.value)} className="block w-full py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[14px]" placeholder="0.00" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[#71787e] text-[13px] font-medium">Unds</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Notas / Comentarios</label>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} className="block w-full py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[14px] resize-none" placeholder="Detalles opcionales..." rows={3} />
                  </div>
                  <div className="pt-2">
                    <button onClick={addProduct} className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-[14px] font-semibold text-[#ffffff] bg-[#0b4f71] hover:bg-[#003752] transition-colors duration-200">
                      <span className="material-symbols-outlined mr-2 text-[20px]">save</span> Guardar Producto
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Producto</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#71787e] text-[20px]">search</span>
                      </div>
                      <select value={productName} onChange={e => setProductName(e.target.value)} className="block w-full pl-10 pr-10 py-2.5 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[14px] appearance-none">
                        <option value="" disabled>Seleccionar producto...</option>
                        {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#71787e] text-[20px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Tipo de Movimiento</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#f0f4f8] p-1.5 rounded-lg border border-[#c1c7ce]/30">
                      <button onClick={() => setType("entrada")} className={`flex items-center justify-center px-4 py-2 text-[14px] font-medium rounded-md transition-all duration-200 ${type === "entrada" ? "bg-[#a4f1b2] text-[#24703e] shadow-sm" : "text-[#41484e] hover:bg-[#e4e9ed]"}`}>
                        <span className="material-symbols-outlined mr-2 text-[18px]">arrow_downward</span> Entrada
                      </button>
                      <button onClick={() => setType("salida")} className={`flex items-center justify-center px-4 py-2 text-[14px] font-medium rounded-md transition-all duration-200 ${type === "salida" ? "bg-[#ffdad6] text-[#93000a] shadow-sm" : "text-[#41484e] hover:bg-[#e4e9ed]"}`}>
                        <span className="material-symbols-outlined mr-2 text-[18px]">arrow_upward</span> Salida
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Cantidad</label>
                    <div className="relative">
                      <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="block w-full py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[14px]" placeholder="0.00" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[#71787e] text-[13px] font-medium">Unds</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button onClick={addMovement} className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-[14px] font-semibold text-[#ffffff] bg-[#0b4f71] hover:bg-[#003752] transition-colors duration-200">
                      <span className="material-symbols-outlined mr-2 text-[20px]">save</span> Registrar Movimiento
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4 border border-[#c1c7ce]">
            <h3 className="text-[18px] font-bold text-[#171c1f] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ba1a1a]">warning</span> Eliminar Producto
            </h3>
            <p className="text-[#41484e] text-[14px]">¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg font-semibold text-[#41484e] hover:bg-[#eaeef2] transition-colors" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="px-4 py-2 rounded-lg font-semibold bg-[#ba1a1a] text-[#ffffff] hover:bg-[#93000a] transition-colors" onClick={() => { deleteProduct(confirmModal); setConfirmModal(null); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
