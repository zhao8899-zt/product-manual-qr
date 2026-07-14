/**
 * ============================================================
 * 数据管理层 store.js v2.0
 * 支持: localStorage + 服务端API + 文件上传
 * ============================================================
 */

(function (global) {
  "use strict";

  var STORAGE_KEY = "pmqr_data_v2";

  /* ---------- 语言选项 ---------- */
  var LANGUAGES = [
    { code: "zh-CN", name: "简体中文", flag: "CN" },
    { code: "zh-TW", name: "繁體中文", flag: "TW" },
    { code: "en", name: "English", flag: "US" },
    { code: "ja", name: "日本語", flag: "JP" },
    { code: "ko", name: "한국어", flag: "KR" },
    { code: "fr", name: "Fran\u00e7ais", flag: "FR" },
    { code: "de", name: "Deutsch", flag: "DE" },
    { code: "es", name: "Espa\u00f1ol", flag: "ES" },
    { code: "ru", name: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "RU" },
    { code: "pt", name: "Portugu\u00eas", flag: "PT" },
    { code: "it", name: "Italiano", flag: "IT" },
    { code: "ar", name: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", flag: "SA" },
    { code: "th", name: "\u0e44\u0e17\u0e22", flag: "TH" },
    { code: "vi", name: "Ti\u1ebfng Vi\u1ec7t", flag: "VN" },
  ];

  /* ---------- 落地页界面多语言 ---------- */
  var I18N = {
    "zh-CN": { selectLang: "选择语言", manuals: "说明书", noManuals: "该语种暂无说明书", noManualsSub: "请尝试切换其他语种", scanTip: "扫码查看产品说明书", loading: "加载中...", notFound: "产品未找到", notFoundDesc: "该产品可能已下架或链接已失效", noProduct: "未指定产品", noProductDesc: "请通过正确的二维码链接访问", contactSupport: "请联系客服获取", poweredBy: "产品说明书中心", viewDoc: "查看", download: "下载", fileType: "格式", uploadDate: "更新" },
    "zh-TW": { selectLang: "選擇語言", manuals: "說明書", noManuals: "該語種暫無說明書", noManualsSub: "請嘗試切換其他語種", scanTip: "掃碼查看產品說明書", loading: "載入中...", notFound: "產品未找到", notFoundDesc: "該產品可能已下架或連結已失效", noProduct: "未指定產品", noProductDesc: "請通過正確的二維碼連結訪問", contactSupport: "請聯繫客服獲取", poweredBy: "產品說明書中心", viewDoc: "查看", download: "下載", fileType: "格式", uploadDate: "更新" },
    "en": { selectLang: "Select Language", manuals: "Manuals", noManuals: "No manuals available for this language", noManualsSub: "Please try another language", scanTip: "Scan QR code to view product manuals", loading: "Loading...", notFound: "Product Not Found", notFoundDesc: "This product may have been discontinued or the link is invalid", noProduct: "No Product Specified", noProductDesc: "Please access via a valid QR code link", contactSupport: "Please contact customer service", poweredBy: "Product Manual Center", viewDoc: "View", download: "Download", fileType: "Format", uploadDate: "Updated" },
    "ja": { selectLang: "言語を選択", manuals: "取扱説明書", noManuals: "この言語の説明書はありません", noManualsSub: "他の言語をお試しください", scanTip: "QRコードをスキャンして製品マニュアルを表示", loading: "読み込み中...", notFound: "製品が見つかりません", notFoundDesc: "この製品は販売終了またはリンクが無効です", noProduct: "製品が指定されていません", noProductDesc: "正しいQRコードリンクからアクセスしてください", contactSupport: "カスタマーサービスにお問い合わせください", poweredBy: "製品マニュアルセンター", viewDoc: "表示", download: "ダウンロード", fileType: "形式", uploadDate: "更新日" },
    "ko": { selectLang: "언어 선택", manuals: "설명서", noManuals: "이 언어의 설명서가 없습니다", noManualsSub: "다른 언어를 시도해 보세요", scanTip: "QR 코드를 스캔하여 제품 설명서 보기", loading: "로딩 중...", notFound: "제품을 찾을 수 없습니다", notFoundDesc: "이 제품은 단종되었거나 링크가 만료되었습니다", noProduct: "제품이 지정되지 않음", noProductDesc: "올바른 QR 코드 링크를 통해 접속하세요", contactSupport: "고객 서비스에 문의하세요", poweredBy: "제품 설명서 센터", viewDoc: "보기", download: "다운로드", fileType: "형식", uploadDate: "업데이트" },
    "fr": { selectLang: "Choisir la langue", manuals: "Manuels", noManuals: "Aucun manuel dans cette langue", noManualsSub: "Veuillez essayer une autre langue", scanTip: "Scannez le QR code pour voir les manuels", loading: "Chargement...", notFound: "Produit introuvable", notFoundDesc: "Ce produit a peut-être \u00e9t\u00e9 abandonn\u00e9 ou le lien est invalide", noProduct: "Aucun produit sp\u00e9cifi\u00e9", noProductDesc: "Veuillez acc\u00e9der via un lien QR code valide", contactSupport: "Veuillez contacter le service client", poweredBy: "Centre de manuels produit", viewDoc: "Voir", download: "T\u00e9l\u00e9charger", fileType: "Format", uploadDate: "Mis \u00e0 jour" },
    "de": { selectLang: "Sprache w\u00e4hlen", manuals: "Handb\u00fccher", noManuals: "Keine Handb\u00fccher in dieser Sprache", noManualsSub: "Bitte versuchen Sie eine andere Sprache", scanTip: "QR-Code scannen, um Produkt handb\u00fccher zu sehen", loading: "Laden...", notFound: "Produkt nicht gefunden", notFoundDesc: "Dieses Produkt wurde m\u00f6glicherweise eingestellt oder der Link ist ung\u00fcltig", noProduct: "Kein Produkt angegeben", noProductDesc: "Bitte \u00fcber einen g\u00fcltigen QR-Code-Link zugreifen", contactSupport: "Bitte wenden Sie sich an den Kundenservice", poweredBy: "Produkthandbuchzentrum", viewDoc: "Ansehen", download: "Herunterladen", fileType: "Format", uploadDate: "Aktualisiert" },
    "es": { selectLang: "Seleccionar idioma", manuals: "Manuales", noManuals: "No hay manuales en este idioma", noManualsSub: "Por favor, intente otro idioma", scanTip: "Escanee el c\u00f3digo QR para ver los manuales", loading: "Cargando...", notFound: "Producto no encontrado", notFoundDesc: "Este producto puede haber sido discontinuado o el enlace no es v\u00e1lido", noProduct: "Producto no especificado", noProductDesc: "Acceda a trav\u00e9s de un enlace de c\u00f3digo QR v\u00e1lido", contactSupport: "Contacte con el servicio al cliente", poweredBy: "Centro de manuales de productos", viewDoc: "Ver", download: "Descargar", fileType: "Formato", uploadDate: "Actualizado" },
    "ru": { selectLang: "Выбрать язык", manuals: "Руководства", noManuals: "Нет руководств на этом языке", noManualsSub: "Попробуйте другой язык", scanTip: "Сканируйте QR-код для просмотра руководств", loading: "Загрузка...", notFound: "Продукт не найден", notFoundDesc: "Этот продукт мог быть снят с производства или ссылка недействительна", noProduct: "Продукт не указан", noProductDesc: "Получите доступ по действительной ссылке QR-кода", contactSupport: "Свяжитесь со службой поддержки", poweredBy: "Центр руководств по продуктам", viewDoc: "Открыть", download: "Скачать", fileType: "Формат", uploadDate: "Обновлено" },
    "pt": { selectLang: "Selecionar idioma", manuals: "Manuais", noManuals: "Nenhum manual neste idioma", noManualsSub: "Tente outro idioma", scanTip: "Leia o c\u00f3digo QR para ver os manuais", loading: "Carregando...", notFound: "Produto n\u00e3o encontrado", notFoundDesc: "Este produto pode ter sido descontinuado ou o link \u00e9 inv\u00e1lido", noProduct: "Nenhum produto especificado", noProductDesc: "Acesse atrav\u00e9s de um link de c\u00f3digo QR v\u00e1lido", contactSupport: "Entre em contato com o servi\u00e7o ao cliente", poweredBy: "Centro de manuais de produtos", viewDoc: "Ver", download: "Baixar", fileType: "Formato", uploadDate: "Atualizado" },
    "it": { selectLang: "Seleziona lingua", manuals: "Manuali", noManuals: "Nessun manuale in questa lingua", noManualsSub: "Prova un'altra lingua", scanTip: "Scansiona il codice QR per vedere i manuali", loading: "Caricamento...", notFound: "Prodotto non trovato", notFoundDesc: "Questo prodotto potrebbe essere stato discontinuato o il link non \u00e8 valido", noProduct: "Nessun prodotto specificato", noProductDesc: "Accedi tramite un link codice QR valido", contactSupport: "Contatta il servizio clienti", poweredBy: "Centro manuali prodotti", viewDoc: "Visualizza", download: "Scarica", fileType: "Formato", uploadDate: "Aggiornato" },
    "ar": { selectLang: "اختر اللغة", manuals: "الأدلة", noManuals: "لا توجد أدلة بهذه اللغة", noManualsSub: "يرجى تجربة لغة أخرى", scanTip: "امسح رمز QR لعرض أدلة المنتج", loading: "جار التحميل...", notFound: "المنتج غير موجود", notFoundDesc: "قد تم إيقاف هذا المنتج أو الرابط غير صالح", noProduct: "لم يتم تحديد المنتج", noProductDesc: "يرجى الوصول عبر رابط رمز QR صالح", contactSupport: "يرجى الاتصال بخدمة العملاء", poweredBy: "مركز أدلة المنتجات", viewDoc: "عرض", download: "تحميل", fileType: "التنسيق", uploadDate: "تحديث" },
    "th": { selectLang: "เลือกภาษา", manuals: "คู่มือ", noManuals: "ไม่มีคู่มือภาษานี้", noManualsSub: "กรุณาลองภาษาอื่น", scanTip: "สแกน QR code เพื่อดูคู่มือผลิตภัณฑ์", loading: "กำลังโหลด...", notFound: "ไม่พบผลิตภัณฑ์", notFoundDesc: "ผลิตภัณฑ์นี้อาจถูกยกเลิกหรือลิงก์ไม่ถูกต้อง", noProduct: "ไม่ได้ระบุผลิตภัณฑ์", noProductDesc: "กรุณาเข้าถึงผ่านลิงก์ QR code ที่ถูกต้อง", contactSupport: "กรุณาติดต่อฝ่ายบริการลูกค้า", poweredBy: "ศูนย์คู่มือผลิตภัณฑ์", viewDoc: "ดู", download: "ดาวน์โหลด", fileType: "รูปแบบ", uploadDate: "อัปเดต" },
    "vi": { selectLang: "Chọn ngôn ngữ", manuals: "Hướng dẫn", noManuals: "Không có hướng dẫn bằng ngôn ngữ này", noManualsSub: "Vui lòng thử ngôn ngữ khác", scanTip: "Quét mã QR để xem hướng dẫn sản phẩm", loading: "Đang tải...", notFound: "Không tìm thấy sản phẩm", notFoundDesc: "Sản phẩm này có thể đã ngừng sản xuất hoặc liên kết không hợp lệ", noProduct: "Chưa chỉ định sản phẩm", noProductDesc: "Vui lòng truy cập qua liên kết mã QR hợp lệ", contactSupport: "Vui lòng liên hệ dịch vụ khách hàng", poweredBy: "Trung tâm hướng dẫn sản phẩm", viewDoc: "Xem", download: "Tải xuống", fileType: "Định dạng", uploadDate: "Cập nhật" },
  };

  /* ---------- 说明书类型 ---------- */
  var MANUAL_TYPES = [
    { code: "installation", name: "安装指南", nameEn: "Installation Guide", emoji: "\ud83d\udd27", color: "blue" },
    { code: "usage", name: "使用说明", nameEn: "User Manual", emoji: "\ud83d\udcd6", color: "green" },
    { code: "after-sales", name: "售后服务", nameEn: "After-Sales Service", emoji: "\ud83c\udfa7", color: "orange" },
    { code: "safety", name: "安规认证", nameEn: "Safety & Compliance", emoji: "\u26d4\ufe0f", color: "red" },
  ];

  /* ---------- 默认数据 ---------- */
  var DEFAULT_CONFIG = {
    brandName: "Product Manual Center",
    brandSub: "PRODUCT MANUAL CENTER",
    baseUrl: "https://harmonious-biscochitos-7228e1.netlify.app",
    footerText: "Scan QR code to view product manuals",
    footerLink: "",
    footerLinkText: "",
  };

  /* ---------- 内部状态 ---------- */
  var state = null;
  var isServerMode = false;
  var serverDataLoaded = false;
  var onReadyCallbacks = [];
  var syncTimeout = null;

  /* ---------- 初始化 ---------- */
  function init() {
    // 0. 优先使用嵌入数据（静态部署时使用）
    if (typeof window !== "undefined" && window.PMQR_EMBEDDED_DATA && window.PMQR_EMBEDDED_DATA.products) {
      state = window.PMQR_EMBEDDED_DATA;
      if (!state.siteConfig) state.siteConfig = deepClone(DEFAULT_CONFIG);
      saveLocal();
    }
    // 1. 从 localStorage 加载（如果没有嵌入数据）
    if (!state) {
      load();
    }
    if (!state) {
      state = { siteConfig: deepClone(DEFAULT_CONFIG), products: [] };
      save();
    }
    // 2. 异步从服务器加载最新数据（静态部署时自动失败，使用已有数据）
    initServer();
  }

  function initServer() {
    fetch("/api/data")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.products) {
          state = data;
          if (!state.siteConfig) state.siteConfig = deepClone(DEFAULT_CONFIG);
          saveLocal();
          isServerMode = true;
        }
        serverDataLoaded = true;
        flushReadyCallbacks();
      })
      .catch(function () {
        // 服务器不可用，使用 localStorage
        serverDataLoaded = true;
        flushReadyCallbacks();
      });
  }

  function flushReadyCallbacks() {
    var cbs = onReadyCallbacks.slice();
    onReadyCallbacks = [];
    cbs.forEach(function (cb) { cb(); });
  }

  /* ---------- 持久化 ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = JSON.parse(raw);
    } catch (e) { state = null; }
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { console.error("localStorage save failed:", e); }
  }

  function save() {
    saveLocal();
    // 防抖同步到服务器
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(syncToServer, 500);
  }

  function syncToServer() {
    if (!isServerMode) return;
    fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    }).catch(function (err) {
      console.error("Server sync failed:", err);
    });
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function genId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /* ---------- 文件上传 ---------- */
  // v3.0: 使用 base64 JSON 上传（兼容 Netlify Functions）
  function uploadFile(file, productId, onProgress, callback) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var base64Data = e.target.result.split(",")[1]; // Remove data:... prefix

      if (onProgress) onProgress(50); // Reading done

      var xhr = new XMLHttpRequest();
      if (onProgress) {
        xhr.upload.addEventListener("progress", function (e) {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }
      xhr.addEventListener("load", function () {
        if (xhr.status === 200) {
          try { callback(null, JSON.parse(xhr.responseText)); }
          catch (e) { callback(e); }
        } else {
          callback(new Error("Upload failed: " + xhr.status + " " + xhr.responseText));
        }
      });
      xhr.addEventListener("error", function () {
        callback(new Error("Network error during upload"));
      });
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({
        fileName: file.name,
        fileContent: base64Data,
        productId: productId || "general",
      }));
    };
    reader.onerror = function () {
      callback(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  }

  function deleteFile(filePath, callback) {
    fetch("/api/file?path=" + encodeURIComponent(filePath), { method: "DELETE" })
      .then(function (res) { return res.json(); })
      .then(function (data) { callback(null, data); })
      .catch(function (err) { callback(err); });
  }

  /* ---------- 站点配置 ---------- */
  function getSiteConfig() { return state.siteConfig || {}; }

  function updateSiteConfig(config) {
    state.siteConfig = Object.assign({}, state.siteConfig, config);
    save();
  }

  /* ---------- 产品 CRUD ---------- */
  function getProducts() { return state.products || []; }

  function getProduct(id) {
    return (state.products || []).find(function (p) { return p.id === id; });
  }

  function addProduct(product) {
    var newProduct = {
      id: genId("p"),
      name: product.name || "",
      model: product.model || "",
      category: product.category || "",
      description: product.description || "",
      createdAt: new Date().toISOString(),
      manuals: product.manuals || [],
    };
    state.products.push(newProduct);
    save();
    return newProduct;
  }

  function updateProduct(id, updates) {
    var product = getProduct(id);
    if (!product) return null;
    Object.keys(updates).forEach(function (key) {
      if (key !== "id" && key !== "createdAt") product[key] = updates[key];
    });
    save();
    return product;
  }

  function deleteProduct(id) {
    var idx = state.products.findIndex(function (p) { return p.id === id; });
    if (idx >= 0) { state.products.splice(idx, 1); save(); return true; }
    return false;
  }

  /* ---------- 说明书 CRUD ---------- */
  function getManuals(productId) {
    var product = getProduct(productId);
    return product ? (product.manuals || []) : [];
  }

  function addManual(productId, manual) {
    var product = getProduct(productId);
    if (!product) return null;
    var ext = manual.pdfUrl ? manual.pdfUrl.split(".").pop().toLowerCase() : "";
    var newManual = {
      id: genId("m"),
      language: manual.language || "zh-CN",
      type: manual.type || "usage",
      title: manual.title || "",
      pdfUrl: manual.pdfUrl || "",
      fileType: manual.fileType || ext || "",
      fileSize: manual.fileSize || 0,
      uploadDate: new Date().toISOString().split("T")[0],
    };
    if (!product.manuals) product.manuals = [];
    product.manuals.push(newManual);
    save();
    return newManual;
  }

  function updateManual(productId, manualId, updates) {
    var product = getProduct(productId);
    if (!product || !product.manuals) return null;
    var manual = product.manuals.find(function (m) { return m.id === manualId; });
    if (!manual) return null;
    Object.keys(updates).forEach(function (key) {
      if (key !== "id") manual[key] = updates[key];
    });
    // 自动检测文件类型
    if (manual.pdfUrl && !manual.fileType) {
      manual.fileType = manual.pdfUrl.split(".").pop().toLowerCase();
    }
    save();
    return manual;
  }

  function deleteManual(productId, manualId) {
    var product = getProduct(productId);
    if (!product || !product.manuals) return false;
    var idx = product.manuals.findIndex(function (m) { return m.id === manualId; });
    if (idx >= 0) { product.manuals.splice(idx, 1); save(); return true; }
    return false;
  }

  /* ---------- 数据导入导出 ---------- */
  function exportData() { return deepClone(state); }

  function importData(data) {
    if (!data || !data.products) return false;
    state = data;
    if (!state.siteConfig) state.siteConfig = deepClone(DEFAULT_CONFIG);
    save();
    return true;
  }

  function clearAllData() {
    state = { siteConfig: deepClone(DEFAULT_CONFIG), products: [] };
    save();
  }

  /* ---------- 工具方法 ---------- */
  function getLanguageByCode(code) {
    return LANGUAGES.find(function (l) { return l.code === code; });
  }

  function getManualTypeByCode(code) {
    return MANUAL_TYPES.find(function (t) { return t.code === code; });
  }

  function getI18N(langCode) {
    return I18N[langCode] || I18N["en"];
  }

  function getProductUrl(productId) {
    var config = getSiteConfig();
    var base = config.baseUrl || "";
    if (!base && typeof window !== "undefined" && window.location) {
      // 自动检测当前站点地址
      var path = window.location.pathname;
      var dir = path.substring(0, path.lastIndexOf("/"));
      base = window.location.origin + dir;
    }
    if (base) {
      var sep = base.endsWith("/") ? "" : "/";
      return base + sep + "product.html?id=" + productId;
    }
    return "product.html?id=" + productId;
  }

  function getAbsoluteUrl(relativeUrl) {
    if (!relativeUrl) return "";
    if (relativeUrl.startsWith("http")) return relativeUrl;
    var origin = window.location.origin;
    var path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/"));
    if (relativeUrl.startsWith("/")) return origin + relativeUrl;
    return origin + path + "/" + relativeUrl;
  }

  function getFileViewerUrl(pdfUrl, fileType) {
    var ext = (fileType || "").toLowerCase();
    var absoluteUrl = getAbsoluteUrl(pdfUrl);

    // PDF: 直接打开（浏览器内置查看器）
    if (ext === "pdf") return absoluteUrl;

    // Word: 使用 Microsoft Office Online 查看器（全球可用）
    if (ext === "doc" || ext === "docx") {
      return "https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(absoluteUrl);
    }

    // 其他: 直接下载
    return absoluteUrl;
  }

  function getStats() {
    var products = getProducts();
    var totalManuals = 0;
    var languages = {};
    var types = {};
    products.forEach(function (p) {
      (p.manuals || []).forEach(function (m) {
        totalManuals++;
        languages[m.language] = (languages[m.language] || 0) + 1;
        types[m.type] = (types[m.type] || 0) + 1;
      });
    });
    return {
      totalProducts: products.length,
      totalManuals: totalManuals,
      totalLanguages: Object.keys(languages).length,
      totalTypes: Object.keys(types).length,
    };
  }

  /* ---------- 对外 API ---------- */
  global.PMQRStore = {
    init: init,
    LANGUAGES: LANGUAGES,
    MANUAL_TYPES: MANUAL_TYPES,
    I18N: I18N,
    // 异步就绪
    waitForData: function (cb) {
      if (serverDataLoaded) cb();
      else onReadyCallbacks.push(cb);
    },
    isServerMode: function () { return isServerMode; },
    onServerData: function (cb) { onReadyCallbacks.push(cb); },
    // 文件操作
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    getFileViewerUrl: getFileViewerUrl,
    getAbsoluteUrl: getAbsoluteUrl,
    // 站点配置
    getSiteConfig: getSiteConfig,
    updateSiteConfig: updateSiteConfig,
    // 产品
    getProducts: getProducts,
    getProduct: getProduct,
    addProduct: addProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    // 说明书
    getManuals: getManuals,
    addManual: addManual,
    updateManual: updateManual,
    deleteManual: deleteManual,
    // 数据
    exportData: exportData,
    importData: importData,
    clearAllData: clearAllData,
    // 工具
    getLanguageByCode: getLanguageByCode,
    getManualTypeByCode: getManualTypeByCode,
    getI18N: getI18N,
    getProductUrl: getProductUrl,
    getStats: getStats,
  };
})(window);
