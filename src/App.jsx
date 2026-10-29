import { useState, useEffect, useRef } from "react";

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

// Mismo tope que el API (api/movements.js).
const CANTIDAD_MAXIMA = 1000000;

// Un producto con menos de estas unidades se marca como crítico.
const STOCK_CRITICO = 5;

const PRODUCTS_PER_PAGE = 12;
const MOVEMENTS_PER_PAGE = 10;

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

const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "name", label: "Nombre A-Z" },
  { value: "stock-asc", label: "Stock: menor a mayor" },
  { value: "stock-desc", label: "Stock: mayor a menor" }
];

const isCritical = (p) => p.stock < STOCK_CRITICO;

export default function StockApp() {
  const API_URL = import.meta.env.VITE_API_URL || "/api";

  const [areas, setAreas] = useState({});
  const [activeArea, setActiveArea] = useState("PECUARIO");
  const [movementsByArea, setMovementsByArea] = useState({});
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("");
  const [type, setType] = useState("entrada");

  const [newProduct, setNewProduct] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [comment, setComment] = useState("");

  const [notification, setNotification] = useState(null);
  const notificationTimer = useRef(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);

  const [pageProducts, setPageProducts] = useState(1);
  const [pageMovements, setPageMovements] = useState(1);

  const [filterProduct, setFilterProduct] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [onlyCritical, setOnlyCritical] = useState(false);

  const [confirmModal, setConfirmModal] = useState(null); // producto a eliminar

  // UI State for new design
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "history"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("product"); // "product" | "movement"
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const products = areas[activeArea] || [];
  const movements = movementsByArea[activeArea] || [];

  const criticalCount = products.filter(isCritical).length;

  const searchedProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => !onlyCritical || isCritical(p))
    .sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
        case "stock-asc": return a.stock - b.stock;
        case "stock-desc": return b.stock - a.stock;
        default: return b.id - a.id;
      }
    });

  const totalProductPages = Math.max(1, Math.ceil(searchedProducts.length / PRODUCTS_PER_PAGE));
  const currentProductPage = Math.min(pageProducts, totalProductPages);

  const paginatedProducts = searchedProducts.slice(
    (currentProductPage - 1) * PRODUCTS_PER_PAGE,
    currentProductPage * PRODUCTS_PER_PAGE
  );

  const filteredMovements = movements.filter(m => {
    const matchProduct = filterProduct ? m.product === filterProduct : true;
    const matchDate = filterDate ? m.date?.startsWith(filterDate) : true;
    return matchProduct && matchDate;
  });

  const totalMovementPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENTS_PER_PAGE));
  const currentMovementPage = Math.min(pageMovements, totalMovementPages);

  const paginatedMovements = filteredMovements.slice(
    (currentMovementPage - 1) * MOVEMENTS_PER_PAGE,
    currentMovementPage * MOVEMENTS_PER_PAGE
  );

  const entradasTotal = filteredMovements.filter(m => m.type === "entrada").reduce((s, m) => s + m.qty, 0);
  const salidasTotal = filteredMovements.filter(m => m.type === "salida").reduce((s, m) => s + m.qty, 0);

  // Producto seleccionado en el modal de movimiento y stock resultante.
  const selectedProduct = products.find(p => p.name === productName) || null;
  const amountPreview = Number(qty);
  const hasAmountPreview = selectedProduct && Number.isInteger(amountPreview) && amountPreview > 0;
  const resultingStock = hasAmountPreview
    ? selectedProduct.stock + (type === "entrada" ? amountPreview : -amountPreview)
    : null;

  const notify = (message, kind = "info") => {
    clearTimeout(notificationTimer.current);
    setNotification({ message, type: kind });
    // Los errores duran más para que dé tiempo a leerlos.
    notificationTimer.current = setTimeout(() => setNotification(null), kind === "error" ? 6000 : 3000);
  };

  const closeNotification = () => {
    clearTimeout(notificationTimer.current);
    setNotification(null);
  };

  const selectArea = (area) => {
    if (area === activeArea) return;
    setActiveArea(area);
    // Todo lo que depende de los productos del área anterior se limpia aquí.
    // Si no, el modal de movimiento conservaba el producto viejo y lo guardaba
    // con el área nueva (ej. "CILINDROS AZULES" de NUPEC registrado en KUBOTA).
    setProductName("");
    setFilterProduct("");
    setPageProducts(1);
    setPageMovements(1);
  };

  // Lee JSON del API; si el servidor no responde JSON (p. ej. `npm run dev` sin
  // API local) lanza un error legible en lugar de dejar la pantalla cargando.
  const fetchJson = async (url) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok || data === null) {
      throw new Error("El API no responde. En desarrollo usa `npm run dev:local`.");
    }
    return data;
  };

  const loadProducts = async () => {
    setLoading(true);
    const area = activeArea;
    try {
      const data = await fetchJson(`${API_URL}/products?area=${area}`);
      setAreas(prev => ({ ...prev, [area]: data }));
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    const area = activeArea;
    try {
      const data = await fetchJson(`${API_URL}/movements?area=${area}`);
      // Se guarda por área, igual que los productos: si el usuario cambia de
      // categoría antes de que responda el servidor, la respuesta tardía no
      // aparece bajo la categoría equivocada.
      setMovementsByArea(prev => ({ ...prev, [area]: data }));
    } catch {
      // loadProducts ya avisó del fallo del API.
    }
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

  // Escape cierra el modal abierto (primero el de confirmación si hay dos).
  useEffect(() => {
    if (!isModalOpen && !confirmModal) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (confirmModal) setConfirmModal(null);
      else setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, confirmModal]);

  const addProduct = async () => {
    if (saving) return;
    if (!newProduct.trim()) {
      notify("Ingresa nombre del producto", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct,
          stock: Number(initialStock || 0),
          comment,
          area: activeArea
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify(data.error || "No se pudo guardar el producto", "error");
        return;
      }
    } catch {
      notify("Sin conexión: no se guardó el producto", "error");
      return;
    } finally {
      setSaving(false);
    }

    notify("Producto guardado", "success");

    setNewProduct("");
    setInitialStock("");
    setComment("");
    setIsModalOpen(false);

    loadProducts();
  };

  const saveEdit = async () => {
    if (saving) return;
    if (!newProduct.trim()) {
      notify("Ingresa nombre del producto", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: newProduct, stock: Number(initialStock || 0), comment })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify(data.error || "No se pudo actualizar el producto", "error");
        return;
      }
    } catch {
      notify("Sin conexión: no se actualizó el producto", "error");
      return;
    } finally {
      setSaving(false);
    }

    setEditingId(null);
    setNewProduct("");
    setInitialStock("");
    setComment("");
    setIsModalOpen(false);
    notify("Producto actualizado", "success");
    loadProducts();
    loadMovements();
  };

  const deleteProduct = async (id) => {
    let res;
    try {
      res = await fetch(`${API_URL}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
    } catch {
      notify("Sin conexión: no se eliminó el producto", "error");
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify(data.error || "No se pudo eliminar el producto", "error");
      return;
    }

    notify("Producto eliminado", "success");
    loadProducts();
  };

  const addMovement = async () => {
    if (saving) return;
    if (!productName || !qty) {
      notify("Selecciona producto y cantidad", "error");
      return;
    }

    // El producto debe existir en el área activa: el nombre vive en el estado
    // y no debe poder colarse desde otra área.
    if (!products.some(p => p.name === productName)) {
      notify(`"${productName}" no pertenece a ${activeArea}. Selecciona el producto de nuevo.`, "error");
      setProductName("");
      return;
    }

    const amount = Number(qty);
    if (!Number.isInteger(amount) || amount <= 0 || amount > CANTIDAD_MAXIMA) {
      notify(`La cantidad debe ser un número entero entre 1 y ${CANTIDAD_MAXIMA.toLocaleString("es-MX")}`, "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productName,
          qty: amount,
          type,
          area: activeArea
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify(data.error || "No se pudo guardar el movimiento", "error");
        // Si el producto ya no existe en el área (p. ej. lo borraron desde otro
        // dispositivo), se limpia la selección y se recarga el catálogo del área.
        if (data.code === "PRODUCTO_NO_EXISTE") {
          setProductName("");
          loadProducts();
        }
        return;
      }
    } catch {
      notify("Sin conexión: no se guardó el movimiento", "error");
      return;
    } finally {
      setSaving(false);
    }

    notify(`${type === "entrada" ? "Entrada" : "Salida"} de ${amount} registrada para ${productName}`, "success");

    setQty("");
    setProductName("");
    setIsModalOpen(false);

    loadProducts();
    loadMovements();
  };

  // Abre el modal de movimiento. Con producto, lo deja preseleccionado como salida
  // (el caso más frecuente); sin producto, abre vacío.
  const openMovementModal = (product = null) => {
    setEditingId(null);
    setProductName(product ? product.name : "");
    setQty("");
    if (product) setType("salida");
    setModalType("movement");
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingId(p.id);
    setNewProduct(p.name);
    setInitialStock(p.stock);
    setComment(p.comment || "");
    setModalType("product");
    setIsModalOpen(true);
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
    setEditingId(null);
    setNewProduct("");
    setInitialStock("");
    setComment("");
    setProductName("");
    setQty("");
    setModalType(activeTab === "history" ? "movement" : "product");
    setIsModalOpen(false); // reset state to allow animation
    setTimeout(() => setIsModalOpen(true), 10);
  };

  const fabLabel = activeTab === "history" ? "Nuevo movimiento" : "Nuevo producto";

  const iconButtonClass = "inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-colors";
  const pagerButtonClass = `${iconButtonClass} text-[#71787e] hover:text-[#171c1f] hover:bg-[#eaeef2] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed`;

  return (
    <div className={`min-h-screen bg-[#f6fafe] text-[#171c1f] font-sans antialiased pb-28 transition-all duration-300 ${isSidebarExpanded ? 'md:pl-80' : 'md:pl-20'}`}>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          -webkit-tap-highlight-color: transparent !important;
        }

        body {
          font-family: 'Inter', sans-serif;
          -webkit-touch-callout: none;
        }

        /* Todo lo clicable muestra el cursor de mano; lo deshabilitado no. */
        button:not(:disabled), select, label[for], summary { cursor: pointer; }

        /* Anillo de foco visible solo al navegar con teclado. */
        :focus-visible {
          outline: 2px solid #0b4f71;
          outline-offset: 2px;
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

        /* Respeta la preferencia de movimiento reducido del sistema. */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .ripple-element { display: none; }
        }

        .icon-fill { font-variation-settings: 'FILL' 1; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Zona de avisos: siempre presente para que los lectores de pantalla la anuncien. */}
      <div aria-live="polite" role="status" className="fixed right-4 left-4 sm:left-auto top-20 z-[110] flex justify-end pointer-events-none">
        {notification && (
          <div className={`pointer-events-auto shadow-lg pl-5 pr-2 py-3 rounded-xl flex items-center gap-3 w-full sm:w-auto sm:min-w-[320px] sm:max-w-md font-medium border ${
            notification.type === "success" ? "bg-[#a6f4b5] text-[#00210b] border-[#78dc77]" :
            notification.type === "error" ? "bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]" :
            "bg-[#c9e6ff] text-[#001e2f] border-[#97cdf4]"
          }`}>
            <span className="material-symbols-outlined shrink-0">
              {notification.type === "success" ? "check_circle" : notification.type === "error" ? "error" : "info"}
            </span>
            <div className="flex-1 text-[14px] leading-snug">{notification.message}</div>
            <button onClick={closeNotification} aria-label="Cerrar aviso" title="Cerrar" className={`${iconButtonClass} hover:bg-black/10`}>
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}
      </div>

      {/* TopAppBar (Web & Mobile Header) */}
      <header className={`fixed top-0 left-0 right-0 z-40 bg-[#ffffff] shadow-sm flex justify-between items-center px-4 py-3 h-16 border-b border-[#c1c7ce] transition-all duration-300 ${isSidebarExpanded ? 'md:left-80' : 'md:left-20'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} aria-label={isSidebarExpanded ? "Contraer menú" : "Expandir menú"} aria-expanded={isSidebarExpanded} title={isSidebarExpanded ? "Contraer menú" : "Expandir menú"} className={`hidden md:inline-flex ${iconButtonClass} text-[#0b4f71] hover:bg-[#eaeef2]`}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-[20px] md:text-[24px] font-bold text-[#0b4f71] tracking-tight">Fogysa Stock</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={exportExcel} aria-label="Exportar a Excel" title="Exportar a Excel" className="text-[#0b4f71] min-h-[44px] px-3 hover:bg-[#eaeef2] rounded-full transition-colors inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span className="hidden sm:inline text-[13px] font-semibold">Exportar</span>
          </button>
        </div>
      </header>

      {/* SideNav (Desktop) */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-[#ffffff] border-r border-[#c1c7ce] z-50 transition-all duration-300 ${isSidebarExpanded ? 'w-80' : 'w-20'}`}>
        <nav aria-label="Secciones" className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
          <button onClick={() => setActiveTab("catalog")} aria-current={activeTab === "catalog" ? "page" : undefined} title="Catálogo" className={`flex items-center py-3 rounded-lg font-semibold transition-all duration-300 ${isSidebarExpanded ? 'px-4 justify-start' : 'px-0 justify-center'} ${activeTab === "catalog" ? "bg-[#0b4f71] text-[#8bc0e7]" : "text-[#41484e] hover:bg-[#eaeef2] hover:text-[#003752]"}`}>
            <span className={`material-symbols-outlined ${activeTab === "catalog" ? "icon-fill" : ""}`}>inventory_2</span>
            <span className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarExpanded ? 'max-w-[200px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'}`}>
              Catálogo
            </span>
          </button>
          <button onClick={() => setActiveTab("history")} aria-current={activeTab === "history" ? "page" : undefined} title="Historial" className={`flex items-center py-3 rounded-lg font-semibold transition-all duration-300 ${isSidebarExpanded ? 'px-4 justify-start' : 'px-0 justify-center'} ${activeTab === "history" ? "bg-[#0b4f71] text-[#8bc0e7]" : "text-[#41484e] hover:bg-[#eaeef2] hover:text-[#003752]"}`}>
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
          {/* Category Chips */}
          <div role="tablist" aria-label="Categoría" className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 scrollbar-hide">
            {AREA_ORDER.map((area) => (
              <button
                key={area}
                role="tab"
                aria-selected={activeArea === area}
                onClick={() => selectArea(area)}
                className={`whitespace-nowrap min-h-[44px] px-4 rounded-full text-[12px] font-bold uppercase tracking-wider transition-colors shadow-sm ${
                  activeArea === area
                    ? `${AREA_COLORS[area]} text-white border border-transparent`
                    : 'bg-[#ffffff] border border-[#c1c7ce] text-[#171c1f] hover:bg-[#eaeef2]'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {activeTab === "catalog" && (
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1 shadow-sm rounded-lg">
                <label htmlFor="buscar-producto" className="sr-only">Buscar producto</label>
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#71787e] text-[20px]">search</span>
                </div>
                <input id="buscar-producto" type="search" className="w-full min-h-[44px] pl-12 pr-4 py-3 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] placeholder-[#71787e] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent text-[16px] md:text-[14px] transition-shadow" placeholder="Buscar en esta categoría..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setPageProducts(1);}} />
              </div>
              <div className="flex gap-3">
                <label htmlFor="ordenar-por" className="sr-only">Ordenar por</label>
                <select id="ordenar-por" value={sortBy} onChange={e => { setSortBy(e.target.value); setPageProducts(1); }} className="min-h-[44px] px-3 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] text-[14px] flex-1 md:flex-none">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button
                  onClick={() => { setOnlyCritical(v => !v); setPageProducts(1); }}
                  aria-pressed={onlyCritical}
                  title={`Mostrar solo productos con menos de ${STOCK_CRITICO} unidades`}
                  className={`min-h-[44px] px-4 rounded-lg border text-[14px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${onlyCritical ? "bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]" : "bg-[#ffffff] text-[#41484e] border-[#c1c7ce] hover:bg-[#eaeef2]"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Críticos{criticalCount > 0 && <span className="text-[12px] font-bold px-1.5 py-0.5 rounded-full bg-[#ba1a1a] text-white">{criticalCount}</span>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Catalog View */}
        {activeTab === "catalog" && (
          <div className="space-y-4 animate-fade-in">
            {/* Resumen de la categoría */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-[#41484e]">
              <span>
                {loading
                  ? "Cargando inventario..."
                  : `${searchedProducts.length} de ${products.length} productos`}
                {!loading && criticalCount > 0 && <span className="ml-2 text-[#93000a] font-semibold">· {criticalCount} en estado crítico</span>}
              </span>
              <span className="hidden sm:inline">Crítico: menos de {STOCK_CRITICO} unidades</span>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden flex flex-col gap-3">
              {loading && [...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#ffffff] p-4 rounded-xl border border-[#c1c7ce] shadow-sm animate-pulse space-y-3" aria-hidden="true">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
              {!loading && paginatedProducts.map(p => (
                <div key={p.id} className="bg-[#ffffff] p-4 rounded-xl border border-[#c1c7ce] shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCritical(p) ? 'bg-[#ba1a1a]' : 'bg-[#1f6c3a]'}`}></div>
                  <div className="flex justify-between items-start pl-2 gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[16px] font-semibold text-[#171c1f] leading-tight break-words">{p.name}</h3>
                      {p.comment && <p className="text-[14px] text-[#41484e] mt-1">{p.comment}</p>}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-[24px] font-bold ${isCritical(p) ? 'text-[#ba1a1a]' : 'text-[#1f6c3a]'}`}>{p.stock}</span>
                      <span className="text-[12px] text-[#71787e]">Unds</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pl-2 border-t border-[#c1c7ce] pt-3 gap-2">
                    {isCritical(p) ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#93000a] bg-[#ffdad6] px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px]">warning</span> Crítico
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#005226] bg-[#a6f4b5] px-2 py-1 rounded-md">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> En Stock
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => openMovementModal(p)} aria-label={`Registrar movimiento de ${p.name}`} title="Registrar movimiento" className={`${iconButtonClass} text-[#0b4f71] bg-[#c9e6ff] hover:bg-[#97cdf4]`}>
                        <span className="material-symbols-outlined text-[22px]">swap_vert</span>
                      </button>
                      <button onClick={() => openEditModal(p)} aria-label={`Editar ${p.name}`} title="Editar" className={`${iconButtonClass} text-[#41484e] bg-[#eaeef2] hover:text-[#0b4f71]`}>
                        <span className="material-symbols-outlined text-[22px]">edit</span>
                      </button>
                      <button onClick={() => setConfirmModal(p)} aria-label={`Eliminar ${p.name}`} title="Eliminar" className={`${iconButtonClass} text-[#41484e] bg-[#eaeef2] hover:text-[#ba1a1a]`}>
                        <span className="material-symbols-outlined text-[22px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (Data Table) */}
            <div className="hidden md:block bg-[#ffffff] rounded-xl border border-[#c1c7ce] shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <caption className="sr-only">Productos de {activeArea}</caption>
                <thead>
                  <tr className={`${AREA_COLORS[activeArea] || 'bg-[#003d0c]'} text-[#ffffff] border-b border-[#c1c7ce] transition-colors`}>
                    <th scope="col" className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider w-[10%]">Estado</th>
                    <th scope="col" className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider w-[38%]">Producto</th>
                    <th scope="col" className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider w-[20%]">Nota</th>
                    <th scope="col" className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider text-right w-[12%]">Stock</th>
                    <th scope="col" className="py-3 px-4 text-[12px] font-semibold uppercase tracking-wider text-right w-[20%]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c1c7ce]">
                  {loading && [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse" aria-hidden="true">
                      <td className="py-3 px-4"><div className="w-3 h-3 bg-gray-300 rounded-full"></div></td>
                      <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                      <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                      <td className="py-3 px-4"><div className="h-4 bg-gray-200 rounded w-8 ml-auto"></div></td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  ))}
                  {!loading && paginatedProducts.map(p => (
                    <tr key={p.id} className={`transition-colors ${isCritical(p) ? 'bg-[#f0f4f8]' : 'bg-[#ffffff]'} hover:bg-[#eaeef2]`}>
                      <td className="py-2 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${isCritical(p) ? 'text-[#93000a]' : 'text-[#005226]'}`}>
                          <span className={`w-3 h-3 rounded-full inline-block shadow-sm ${isCritical(p) ? 'bg-[#ba1a1a]' : 'bg-[#1f6c3a]'}`}></span>
                          {isCritical(p) ? "Crítico" : "OK"}
                        </span>
                      </td>
                      <td className="py-2 px-4 font-semibold text-[#171c1f]">
                        {p.name}
                      </td>
                      <td className="py-2 px-4 text-[13px] text-[#41484e]">{p.comment || "-"}</td>
                      <td className={`py-2 px-4 text-right font-bold ${isCritical(p) ? 'text-[#ba1a1a]' : 'text-[#1f6c3a]'}`}>
                        {p.stock}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openMovementModal(p)} aria-label={`Registrar movimiento de ${p.name}`} title="Registrar movimiento" className={`${iconButtonClass} text-[#0b4f71] hover:bg-[#c9e6ff]`}><span className="material-symbols-outlined">swap_vert</span></button>
                          <button onClick={() => openEditModal(p)} aria-label={`Editar ${p.name}`} title="Editar" className={`${iconButtonClass} text-[#71787e] hover:text-[#0b4f71] hover:bg-[#eaeef2]`}><span className="material-symbols-outlined">edit</span></button>
                          <button onClick={() => setConfirmModal(p)} aria-label={`Eliminar ${p.name}`} title="Eliminar" className={`${iconButtonClass} text-[#71787e] hover:text-[#ba1a1a] hover:bg-[#ffdad6]`}><span className="material-symbols-outlined">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Estado vacío */}
            {!loading && paginatedProducts.length === 0 && (
              <div className="text-center py-10 bg-[#ffffff] rounded-xl border border-dashed border-[#c1c7ce]">
                <span className="material-symbols-outlined text-[40px] text-[#c1c7ce]">inventory_2</span>
                {products.length === 0 ? (
                  <>
                    <p className="mt-2 font-semibold text-[#41484e]">No hay productos en {activeArea}</p>
                    <p className="text-[14px] text-[#71787e]">Usa el botón + para registrar el primero.</p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 font-semibold text-[#41484e]">No se encontraron productos</p>
                    <p className="text-[14px] text-[#71787e]">
                      {onlyCritical ? "Ningún producto está en estado crítico" : "Prueba con otra búsqueda"}
                      {(searchQuery || onlyCritical) && (
                        <button onClick={() => { setSearchQuery(""); setOnlyCritical(false); setPageProducts(1); }} className="ml-2 text-[#0b4f71] font-semibold underline underline-offset-2">Limpiar filtros</button>
                      )}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalProductPages > 1 && (
              <nav aria-label="Paginación de productos" className="flex items-center justify-center gap-2 py-2">
                <button onClick={() => setPageProducts(p => Math.max(p - 1, 1))} disabled={currentProductPage <= 1} aria-label="Página anterior" title="Página anterior" className={pagerButtonClass}><span className="material-symbols-outlined">chevron_left</span></button>
                <span className="text-[14px] font-semibold text-[#41484e]">Página {currentProductPage} de {totalProductPages}</span>
                <button onClick={() => setPageProducts(p => Math.min(p + 1, totalProductPages))} disabled={currentProductPage >= totalProductPages} aria-label="Página siguiente" title="Página siguiente" className={pagerButtonClass}><span className="material-symbols-outlined">chevron_right</span></button>
              </nav>
            )}
          </div>
        )}

        {/* History View */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-fade-in">
            {/* Filters for History */}
            <div className="flex flex-col sm:flex-row gap-3 w-full bg-[#ffffff] p-4 rounded-xl shadow-sm border border-[#c1c7ce]">
              <label htmlFor="filtro-producto" className="sr-only">Filtrar por producto</label>
              <select
                id="filtro-producto"
                className="min-h-[44px] px-3 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] focus:outline-none focus:ring-2 focus:ring-[#003752] text-[14px] w-full sm:w-64"
                value={filterProduct}
                onChange={e => {setFilterProduct(e.target.value); setPageMovements(1);}}
              >
                <option value="">Todos los productos</option>
                {products.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
              </select>

              <label htmlFor="filtro-fecha" className="sr-only">Filtrar por fecha</label>
              <input
                id="filtro-fecha"
                type="date"
                className="min-h-[44px] px-3 bg-[#ffffff] border border-[#c1c7ce] rounded-lg text-[#171c1f] focus:outline-none focus:ring-2 focus:ring-[#003752] text-[14px] w-full sm:w-auto"
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
                  className="min-h-[44px] text-[#0b4f71] bg-[#c9e6ff] hover:bg-[#97cdf4] px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-[14px] w-full sm:w-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                  Limpiar
                </button>
              )}
            </div>

            {/* Resumen del historial filtrado */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-[#41484e]">
              <span>{filteredMovements.length} movimientos</span>
              <span className="text-[#1f6c3a] font-semibold">+{entradasTotal} entradas</span>
              <span className="text-[#93000a] font-semibold">-{salidasTotal} salidas</span>
              {filterProduct && selectedHistoryStock(products, filterProduct)}
            </div>

            {/* Transaction List (Unified Responsive View) */}
            <div className="flex flex-col gap-3">
              {paginatedMovements.map(m => (
                <div key={m.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#ffffff] rounded-xl border border-[#c1c7ce] hover:border-[#97cdf4] shadow-sm transition-all">
                  <div className="flex items-center gap-4 w-full sm:w-auto mb-3 sm:mb-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${m.type === 'entrada' ? 'bg-[#a4f1b2] text-[#24703e]' : 'bg-[#ffdad6] text-[#93000a]'}`} aria-hidden="true">
                      <span className="material-symbols-outlined icon-fill text-[24px]">
                        {m.type === 'entrada' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-[#171c1f] leading-tight break-words">{m.product}</div>
                      <div className="text-[13px] text-[#41484e] flex items-center gap-2 mt-1">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">calendar_today</span>
                        <time dateTime={m.date}>{new Date(m.date).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</time>
                        <span className="w-1 h-1 bg-[#c1c7ce] rounded-full"></span>
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">inventory_2</span> {m.area || activeArea}
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
                <div className="text-center py-10 bg-[#ffffff] rounded-xl border border-dashed border-[#c1c7ce]">
                  <span className="material-symbols-outlined text-[40px] text-[#c1c7ce]">history</span>
                  <p className="mt-2 font-semibold text-[#41484e]">{movements.length === 0 ? `Sin movimientos en ${activeArea}` : "Ningún movimiento coincide con el filtro"}</p>
                  <p className="text-[14px] text-[#71787e]">{movements.length === 0 ? "Usa el botón + para registrar una entrada o salida." : "Cambia el producto o la fecha."}</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalMovementPages > 1 && (
              <nav aria-label="Paginación del historial" className="flex items-center justify-center gap-2 py-2">
                <button onClick={() => setPageMovements(p => Math.max(p - 1, 1))} disabled={currentMovementPage <= 1} aria-label="Página anterior" title="Página anterior" className={pagerButtonClass}><span className="material-symbols-outlined">chevron_left</span></button>
                <span className="text-[14px] font-semibold text-[#41484e]">Página {currentMovementPage} de {totalMovementPages}</span>
                <button onClick={() => setPageMovements(p => Math.min(p + 1, totalMovementPages))} disabled={currentMovementPage >= totalMovementPages} aria-label="Página siguiente" title="Página siguiente" className={pagerButtonClass}><span className="material-symbols-outlined">chevron_right</span></button>
              </nav>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <button onClick={handleFabClick} aria-label={fabLabel} title={fabLabel} className="fixed overflow-hidden right-6 bottom-24 md:bottom-8 z-50 w-14 h-14 bg-[#003752] text-[#ffffff] rounded-xl shadow-[0_4px_12px_rgba(11,79,113,0.4)] flex items-center justify-center hover:bg-[#0b4f71] active:scale-95 transition-colors">
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* BottomNavBar (Mobile Only) */}
      <nav aria-label="Secciones" className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center py-2 bg-[#ffffff] z-40 border-t border-[#c1c7ce] shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
        <button onClick={() => setActiveTab("catalog")} aria-current={activeTab === "catalog" ? "page" : undefined} className={`flex flex-col items-center justify-center min-h-[44px] px-6 py-1.5 transition-colors ${activeTab === "catalog" ? "text-[#0b4f71] bg-[#c9e6ff] rounded-lg" : "text-[#41484e]"}`}>
          <span className={`material-symbols-outlined mb-0.5 ${activeTab === "catalog" ? "icon-fill" : ""}`}>inventory_2</span>
          <span className="text-[12px] font-medium tracking-wide">Catálogo</span>
        </button>
        <button onClick={() => setActiveTab("history")} aria-current={activeTab === "history" ? "page" : undefined} className={`flex flex-col items-center justify-center min-h-[44px] px-6 py-1.5 transition-colors ${activeTab === "history" ? "text-[#0b4f71] bg-[#c9e6ff] rounded-lg" : "text-[#41484e]"}`}>
          <span className={`material-symbols-outlined mb-0.5 ${activeTab === "history" ? "icon-fill" : ""}`}>history</span>
          <span className="text-[12px] font-medium tracking-wide">Historial</span>
        </button>
      </nav>

      {/* Add / Move Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={(e) => {if(e.target === e.currentTarget) setIsModalOpen(false)}}>
          <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo" className="bg-[#f6fafe] rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col animate-fade-in max-h-[90vh]">
            <div className="px-6 py-3 border-b border-[#c1c7ce]/50 flex justify-between items-center bg-[#ffffff] shadow-sm z-10">
              <h2 id="modal-titulo" className="text-[18px] font-bold text-[#0b4f71] flex items-center gap-2 tracking-tight">
                <span className="material-symbols-outlined" aria-hidden="true">{modalType === "product" ? (editingId ? "edit" : "add_box") : "swap_vert"}</span>
                {modalType === "product" ? (editingId ? "Editar Producto" : "Nuevo Producto") : "Nuevo Movimiento"}
                <span className={`ml-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-sm ${AREA_COLORS[activeArea]}`}>{activeArea}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} aria-label="Cerrar" title="Cerrar" className={`${iconButtonClass} text-[#0b4f71] hover:text-[#ba1a1a] hover:bg-[#eaeef2]`}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
              {modalType === "product" ? (
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); (editingId ? saveEdit : addProduct)(); }}>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label htmlFor="producto-nombre" className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Nombre del producto</label>
                    <input id="producto-nombre" autoFocus value={newProduct} onChange={e => setNewProduct(e.target.value)} className="block w-full min-h-[44px] py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[16px] md:text-[14px]" placeholder="Ej. Gorras negras" />
                  </div>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label htmlFor="producto-stock" className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">{editingId ? "Stock" : "Stock inicial"}</label>
                    <div className="relative">
                      <input id="producto-stock" type="number" inputMode="numeric" step="1" value={initialStock} onChange={e => setInitialStock(e.target.value)} className="block w-full min-h-[44px] py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[16px] md:text-[14px]" placeholder="0" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[#71787e] text-[13px] font-medium">Unds</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label htmlFor="producto-nota" className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Notas / Comentarios</label>
                    <textarea id="producto-nota" value={comment} onChange={e => setComment(e.target.value)} className="block w-full py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[16px] md:text-[14px] resize-none" placeholder="Detalles opcionales..." rows={3} />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={saving} className="w-full min-h-[48px] flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-[14px] font-semibold text-[#ffffff] bg-[#0b4f71] hover:bg-[#003752] transition-colors duration-200 disabled:opacity-60 disabled:cursor-wait">
                      <span className="material-symbols-outlined mr-2 text-[20px]" aria-hidden="true">{editingId ? "save_as" : "save"}</span> {saving ? "Guardando..." : (editingId ? "Actualizar Producto" : "Guardar Producto")}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addMovement(); }}>
                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label htmlFor="movimiento-producto" className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Producto</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#71787e] text-[20px]">search</span>
                      </div>
                      <select id="movimiento-producto" autoFocus={!selectedProduct} value={selectedProduct ? productName : ""} onChange={e => setProductName(e.target.value)} className="block w-full min-h-[44px] pl-10 pr-10 py-2.5 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[16px] md:text-[14px] appearance-none">
                        <option value="" disabled>Seleccionar producto...</option>
                        {products.map(p => <option key={p.id} value={p.name}>{p.name} ({p.stock})</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-[#71787e] text-[20px]">expand_more</span>
                      </div>
                    </div>
                    {selectedProduct && (
                      <p className="mt-2 text-[13px] text-[#41484e]">
                        Stock actual: <span className={`font-bold ${isCritical(selectedProduct) ? "text-[#ba1a1a]" : "text-[#1f6c3a]"}`}>{selectedProduct.stock}</span> unidades
                      </p>
                    )}
                  </div>

                  <fieldset className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <legend className="text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Tipo de Movimiento</legend>
                    <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2 bg-[#f0f4f8] p-1.5 rounded-lg border border-[#c1c7ce]/30">
                      <button type="button" role="radio" aria-checked={type === "entrada"} onClick={() => setType("entrada")} className={`flex items-center justify-center min-h-[44px] px-4 py-2 text-[14px] font-medium rounded-md transition-all duration-200 ${type === "entrada" ? "bg-[#a4f1b2] text-[#24703e] shadow-sm" : "text-[#41484e] hover:bg-[#e4e9ed]"}`}>
                        <span className="material-symbols-outlined mr-2 text-[18px]" aria-hidden="true">arrow_downward</span> Entrada
                      </button>
                      <button type="button" role="radio" aria-checked={type === "salida"} onClick={() => setType("salida")} className={`flex items-center justify-center min-h-[44px] px-4 py-2 text-[14px] font-medium rounded-md transition-all duration-200 ${type === "salida" ? "bg-[#ffdad6] text-[#93000a] shadow-sm" : "text-[#41484e] hover:bg-[#e4e9ed]"}`}>
                        <span className="material-symbols-outlined mr-2 text-[18px]" aria-hidden="true">arrow_upward</span> Salida
                      </button>
                    </div>
                  </fieldset>

                  <div className="bg-[#ffffff] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[#c1c7ce]/40 p-4">
                    <label htmlFor="movimiento-cantidad" className="block text-[12px] font-semibold tracking-wider text-[#41484e] mb-2 uppercase">Cantidad</label>
                    <div className="relative">
                      <input id="movimiento-cantidad" type="number" inputMode="numeric" min="1" step="1" autoFocus={!!selectedProduct} value={qty} onChange={e => setQty(e.target.value)} className="block w-full min-h-[44px] py-2 px-3 border border-[#c1c7ce] focus:outline-none focus:ring-2 focus:ring-[#0b4f71] focus:border-transparent rounded-md bg-[#ffffff] text-[#171c1f] text-[16px] md:text-[14px]" placeholder="0" />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[#71787e] text-[13px] font-medium">Unds</span>
                      </div>
                    </div>
                    {hasAmountPreview && (
                      <p className={`mt-2 text-[13px] flex items-center gap-1 ${resultingStock < 0 ? "text-[#93000a] font-semibold" : "text-[#41484e]"}`} role={resultingStock < 0 ? "alert" : undefined}>
                        {resultingStock < 0 && <span className="material-symbols-outlined text-[16px]" aria-hidden="true">warning</span>}
                        Stock resultante: <span className="font-bold">{resultingStock}</span>
                        {resultingStock < 0 && " · quedará en negativo, revisa la cantidad"}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={saving} className={`w-full min-h-[48px] flex justify-center items-center py-3 px-4 rounded-lg shadow-sm text-[14px] font-semibold text-[#ffffff] transition-colors duration-200 disabled:opacity-60 disabled:cursor-wait ${type === "entrada" ? "bg-[#1f6c3a] hover:bg-[#005226]" : "bg-[#0b4f71] hover:bg-[#003752]"}`}>
                      <span className="material-symbols-outlined mr-2 text-[20px]" aria-hidden="true">save</span> {saving ? "Guardando..." : `Registrar ${type}`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={(e) => {if(e.target === e.currentTarget) setConfirmModal(null)}}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo" aria-describedby="confirmar-texto" className="bg-[#ffffff] p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4 border border-[#c1c7ce]">
            <h3 id="confirmar-titulo" className="text-[18px] font-bold text-[#171c1f] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ba1a1a]" aria-hidden="true">warning</span> Eliminar producto
            </h3>
            <p id="confirmar-texto" className="text-[#41484e] text-[14px]">
              Vas a eliminar <strong className="text-[#171c1f]">{confirmModal.name}</strong> de {activeArea}
              {confirmModal.stock !== 0 && <> con <strong className="text-[#171c1f]">{confirmModal.stock}</strong> unidades en stock</>}.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button autoFocus className="min-h-[44px] px-4 py-2 rounded-lg font-semibold text-[#41484e] hover:bg-[#eaeef2] transition-colors" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="min-h-[44px] px-4 py-2 rounded-lg font-semibold bg-[#ba1a1a] text-[#ffffff] hover:bg-[#93000a] transition-colors" onClick={() => { deleteProduct(confirmModal.id); setConfirmModal(null); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stock actual del producto filtrado en el historial, si sigue existiendo.
function selectedHistoryStock(products, name) {
  const p = products.find(x => x.name === name);
  if (!p) return null;
  return <span>Stock actual de {p.name}: <strong className={isCritical(p) ? "text-[#93000a]" : "text-[#171c1f]"}>{p.stock}</strong></span>;
}
