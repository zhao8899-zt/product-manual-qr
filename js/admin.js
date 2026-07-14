/**
 * ============================================================
 * 管理后台逻辑 admin.js v2.0
 * 产品管理 / 说明书管理 / 文件上传 / 二维码生成
 * ============================================================
 */

(function () {
  "use strict";

  var currentEditProductId = null;
  var currentEditManualId = null;
  var searchKeyword = "";
  var uploadedFileUrl = "";
  var uploadedFileType = "";
  var uploadedFileSize = 0;

  /* ---------- DOM 引用 ---------- */
  var D = {};
  function $(id) { return document.getElementById(id); }

  function cacheDom() {
    ["stat-products","stat-manuals","stat-languages","stat-types",
     "search-input","product-table-body","btn-add-product","btn-export",
     "btn-import","btn-reset","btn-config","import-input",
     "product-modal","product-form","product-modal-title","product-name",
     "product-model","product-category","product-desc","manual-list","btn-add-manual",
     "manual-modal","manual-form","manual-modal-title","manual-language",
     "manual-type","manual-title","manual-pdf-url",
     "qr-modal","qr-display","qr-product-name","qr-product-model","qr-url",
     "btn-download-qr","btn-print-qr","btn-preview-page",
     "config-modal","config-form","config-brand-name","config-brand-sub",
     "config-base-url","config-footer-text","config-footer-link","config-footer-link-text",
     "toast-container","print-layout",
     // v2.0 新增: 文件上传
     "upload-mode-tabs","tab-upload","tab-link","upload-area","link-area",
     "file-input","file-drop-zone","file-info","file-name","file-size",
     "upload-progress","upload-progress-bar","upload-progress-text","btn-clear-file",
     "server-status",
     // v2.1 新增: 自动翻译
     "auto_translate_section","translate_lang_list","btn_auto_translate",
     "translate_progress","translate_progress_bar","translate_progress_text",
     "translate_results"
    ].forEach(function (id) {
      D[id.replace(/-/g, "_")] = $(id);
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    cacheDom();
    PMQRStore.init();
    // 服务器数据加载后刷新
    PMQRStore.waitForData(function () {
      renderAll();
      updateServerStatus();
    });
    bindEvents();
    renderAll();
    updateServerStatus();
  }

  function updateServerStatus() {
    if (!D.server_status) return;
    if (PMQRStore.isServerMode()) {
      D.server_status.innerHTML = '<span class="badge badge-green">🟢 服务器已连接</span>';
    } else {
      D.server_status.innerHTML = '<span class="badge badge-orange">🟡 本地模式（需启动服务器才能上传文件）</span>';
    }
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    if (D.search_input) {
      D.search_input.addEventListener("input", function () {
        searchKeyword = this.value.trim().toLowerCase();
        renderProductTable();
      });
    }
    if (D.btn_add_product) D.btn_add_product.addEventListener("click", function () { openProductModal(null); });
    if (D.product_form) D.product_form.addEventListener("submit", handleProductSave);
    if (D.btn_add_manual) D.btn_add_manual.addEventListener("click", function () { openManualModal(null); });
    if (D.manual_form) D.manual_form.addEventListener("submit", handleManualSave);
    if (D.btn_export) D.btn_export.addEventListener("click", handleExport);
    if (D.btn_import) D.btn_import.addEventListener("click", function () { D.import_input.click(); });
    if (D.import_input) D.import_input.addEventListener("change", handleImport);
    if (D.btn_reset) D.btn_reset.addEventListener("click", handleReset);
    if (D.btn_config) D.btn_config.addEventListener("click", openConfigModal);
    if (D.config_form) D.config_form.addEventListener("submit", handleConfigSave);
    if (D.btn_download_qr) D.btn_download_qr.addEventListener("click", downloadQRCode);
    if (D.btn_print_qr) D.btn_print_qr.addEventListener("click", printQRCode);
    if (D.btn_preview_page) D.btn_preview_page.addEventListener("click", previewProductPage);

    // v2.0: 文件上传模式切换
    if (D.tab_upload) {
      D.tab_upload.addEventListener("click", function () { switchUploadMode("upload"); });
    }
    if (D.tab_link) {
      D.tab_link.addEventListener("click", function () { switchUploadMode("link"); });
    }
    if (D.file_input) {
      D.file_input.addEventListener("change", handleFileSelect);
    }
    if (D.file_drop_zone) {
      // 拖拽上传
      D.file_drop_zone.addEventListener("dragover", function (e) {
        e.preventDefault();
        this.classList.add("drag-over");
      });
      D.file_drop_zone.addEventListener("dragleave", function () {
        this.classList.remove("drag-over");
      });
      D.file_drop_zone.addEventListener("drop", function (e) {
        e.preventDefault();
        this.classList.remove("drag-over");
        if (e.dataTransfer.files.length > 0) {
          D.file_input.files = e.dataTransfer.files;
          handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
      });
      D.file_drop_zone.addEventListener("click", function () {
        D.file_input.click();
      });
    }
    if (D.btn_clear_file) {
      D.btn_clear_file.addEventListener("click", clearUploadedFile);
    }

    // v2.1: 自动翻译
    if (D.btn_auto_translate) {
      D.btn_auto_translate.addEventListener("click", handleAutoTranslate);
    }
    // 语言选择变化时更新翻译区域
    if (D.manual_language) {
      D.manual_language.addEventListener("change", updateTranslateLangList);
    }

    // 模态框关闭
    document.querySelectorAll("[data-modal-close]").forEach(function (btn) {
      btn.addEventListener("click", closeAllModals);
    });
    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === this) closeAllModals();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllModals();
    });
  }

  /* ---------- 渲染 ---------- */
  function renderAll() {
    renderStats();
    renderProductTable();
  }

  function renderStats() {
    var stats = PMQRStore.getStats();
    if (D.stat_products) D.stat_products.textContent = stats.totalProducts;
    if (D.stat_manuals) D.stat_manuals.textContent = stats.totalManuals;
    if (D.stat_languages) D.stat_languages.textContent = stats.totalLanguages;
    if (D.stat_types) D.stat_types.textContent = stats.totalTypes;
  }

  function renderProductTable() {
    var products = PMQRStore.getProducts();
    var filtered = products;

    if (searchKeyword) {
      filtered = products.filter(function (p) {
        var text = (p.name + " " + p.model + " " + p.category + " " + p.description).toLowerCase();
        return text.indexOf(searchKeyword) >= 0;
      });
    }

    if (filtered.length === 0) {
      D.product_table_body.innerHTML =
        '<tr><td colspan="6"><div class="empty-state">' +
        '<div class="empty-icon">📦</div>' +
        '<div>暂无产品数据，点击右上角"添加产品"开始</div>' +
        "</div></td></tr>";
      return;
    }

    var html = filtered.map(function (p) {
      var manualCount = (p.manuals || []).length;
      var langCount = {};
      (p.manuals || []).forEach(function (m) { langCount[m.language] = true; });
      var langTotal = Object.keys(langCount).length;
      var initials = getInitials(p.name);
      var productUrl = PMQRStore.getProductUrl(p.id);

      return (
        '<tr>' +
        '<td><div class="product-name-cell">' +
        '<div class="product-avatar">' + escHtml(initials) + '</div>' +
        '<div class="product-info">' +
        '<div class="name">' + escHtml(p.name) + '</div>' +
        '<div class="model">' + escHtml(p.model || '未填型号') + '</div>' +
        '</div></div></td>' +
        '<td class="hide-mobile">' + (p.category ? '<span class="badge badge-blue">' + escHtml(p.category) + '</span>' : '<span class="badge badge-gray">未分类</span>') + '</td>' +
        '<td><span class="badge badge-green">' + manualCount + ' 份</span></td>' +
        '<td class="hide-mobile"><span class="badge badge-orange">' + langTotal + ' 语种</span></td>' +
        '<td class="hide-mobile" style="font-size:0.75rem;color:var(--text-light);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(productUrl) + '</td>' +
        '<td><div class="action-cell">' +
        '<button class="btn btn-secondary btn-sm btn-icon" onclick="PMQRAdmin.viewQR(\'' + p.id + '\')" title="查看二维码">🔲</button>' +
        '<button class="btn btn-primary btn-sm btn-icon" onclick="PMQRAdmin.editProduct(\'' + p.id + '\')" title="编辑">✏️</button>' +
        '<button class="btn btn-danger btn-sm btn-icon" onclick="PMQRAdmin.deleteProduct(\'' + p.id + '\')" title="删除">🗑️</button>' +
        '</div></td>' +
        '</tr>'
      );
    }).join("");

    D.product_table_body.innerHTML = html;
  }

  /* ---------- 产品模态框 ---------- */
  window.PMQRAdmin = {};

  window.PMQRAdmin.editProduct = function (id) { openProductModal(id); };

  window.PMQRAdmin.deleteProduct = function (id) {
    var product = PMQRStore.getProduct(id);
    if (!product) return;
    if (confirm('确定删除产品「' + product.name + '」及其所有说明书吗？此操作不可撤销。')) {
      PMQRStore.deleteProduct(id);
      showToast("success", "产品已删除");
      renderAll();
    }
  };

  window.PMQRAdmin.viewQR = function (id) { openQRModal(id); };

  window.PMQRAdmin.deleteManual = function (productId, manualId) {
    if (confirm('确定删除此说明书吗？')) {
      PMQRStore.deleteManual(productId, manualId);
      showToast("success", "说明书已删除");
      renderManualList();
      renderAll();
    }
  };

  window.PMQRAdmin.editManual = function (manualId) { openManualModal(manualId); };

  function openProductModal(id) {
    currentEditProductId = id;
    resetUploadState();

    if (id) {
      var product = PMQRStore.getProduct(id);
      if (!product) return;
      D.product_modal_title.textContent = "编辑产品";
      D.product_name.value = product.name || "";
      D.product_model.value = product.model || "";
      D.product_category.value = product.category || "";
      D.product_desc.value = product.description || "";
      renderManualList();
      D.btn_add_manual.style.display = "inline-flex";
    } else {
      D.product_modal_title.textContent = "添加产品";
      D.product_form.reset();
      D.manual_list.innerHTML = '<div class="manual-item-empty">保存产品后可添加说明书</div>';
      D.btn_add_manual.style.display = "none";
    }
    D.product_modal.classList.add("active");
  }

  function handleProductSave(e) {
    e.preventDefault();
    var data = {
      name: D.product_name.value.trim(),
      model: D.product_model.value.trim(),
      category: D.product_category.value.trim(),
      description: D.product_desc.value.trim(),
    };
    if (!data.name) { showToast("error", "请填写产品名称"); return; }

    if (currentEditProductId) {
      PMQRStore.updateProduct(currentEditProductId, data);
      showToast("success", "产品已更新");
    } else {
      var newProduct = PMQRStore.addProduct(data);
      currentEditProductId = newProduct.id;
      showToast("success", "产品已添加，现在可以上传说明书了");
      D.product_modal_title.textContent = "编辑产品";
      D.btn_add_manual.style.display = "inline-flex";
      renderManualList();
    }
    renderAll();
  }

  /* ---------- 说明书管理 ---------- */
  function renderManualList() {
    if (!currentEditProductId) return;
    var manuals = PMQRStore.getManuals(currentEditProductId);

    if (manuals.length === 0) {
      D.manual_list.innerHTML = '<div class="manual-item-empty">暂无说明书，点击上方"添加说明书"</div>';
      return;
    }

    var html = manuals.map(function (m) {
      var lang = PMQRStore.getLanguageByCode(m.language);
      var type = PMQRStore.getManualTypeByCode(m.type);
      var fileBadge = m.fileType ? '<span class="badge badge-gray" style="margin-left:4px;">' + m.fileType.toUpperCase() + '</span>' : '';
      var aiBadge = m.isAutoTranslated ? '<span class="badge badge-purple" style="margin-left:4px;">AI翻译</span>' : '';

      return (
        '<div class="manual-item">' +
        '<div><span class="badge badge-blue">' + escHtml(lang ? lang.name : m.language) + '</span></div>' +
        '<div><span class="badge badge-gray">' + escHtml(type ? type.name : m.type) + '</span></div>' +
        '<div style="font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(m.title || '未命名') + fileBadge + aiBadge + '</div>' +
        '<button class="btn btn-secondary btn-sm btn-icon" onclick="PMQRAdmin.editManual(\'' + m.id + '\')" title="编辑">✏️</button>' +
        '<button class="btn btn-danger btn-sm btn-icon" onclick="PMQRAdmin.deleteManual(\'' + currentEditProductId + "','" + m.id + '\')" title="删除">🗑️</button>' +
        '</div>'
      );
    }).join("");

    D.manual_list.innerHTML = html;
  }

  function openManualModal(manualId) {
    if (!currentEditProductId) { showToast("warning", "请先保存产品"); return; }
    currentEditManualId = manualId;
    resetUploadState();
    fillLanguageOptions();
    fillTypeOptions();

    if (manualId) {
      var product = PMQRStore.getProduct(currentEditProductId);
      var manual = (product.manuals || []).find(function (m) { return m.id === manualId; });
      if (!manual) return;
      D.manual_modal_title.textContent = "编辑说明书";
      D.manual_language.value = manual.language;
      D.manual_type.value = manual.type;
      D.manual_title.value = manual.title || "";
      D.manual_pdf_url.value = manual.pdfUrl || "";

      // 判断是上传的文件还是链接
      if (manual.pdfUrl && manual.pdfUrl.startsWith("/documents/")) {
        switchUploadMode("upload");
        showFileInfo(manual.pdfUrl, manual.fileType, manual.fileSize);
        uploadedFileUrl = manual.pdfUrl;
        uploadedFileType = manual.fileType || "";
        uploadedFileSize = manual.fileSize || 0;
      } else if (manual.pdfUrl) {
        switchUploadMode("link");
      } else {
        switchUploadMode("upload");
      }
    } else {
      D.manual_modal_title.textContent = "添加说明书";
      D.manual_form.reset();
      D.manual_language.value = "zh-CN";
      D.manual_type.value = "usage";
      switchUploadMode("upload");
    }

    D.manual_modal.classList.add("active");
  }

  function fillLanguageOptions() {
    D.manual_language.innerHTML = PMQRStore.LANGUAGES.map(function (l) {
      return '<option value="' + l.code + '">' + escHtml(l.name) + ' (' + l.flag + ')</option>';
    }).join("");
  }

  function fillTypeOptions() {
    D.manual_type.innerHTML = PMQRStore.MANUAL_TYPES.map(function (t) {
      return '<option value="' + t.code + '">' + escHtml(t.name) + ' (' + t.nameEn + ')</option>';
    }).join("");
  }

  function handleManualSave(e) {
    e.preventDefault();

    var pdfUrl = "";
    var fileType = "";
    var fileSize = 0;

    // 检查是上传模式还是链接模式
    var uploadActive = D.tab_upload && D.tab_upload.classList.contains("active");

    if (uploadActive) {
      if (uploadedFileUrl) {
        pdfUrl = uploadedFileUrl;
        fileType = uploadedFileType;
        fileSize = uploadedFileSize;
      } else {
        showToast("error", "请先上传文件");
        return;
      }
    } else {
      pdfUrl = D.manual_pdf_url.value.trim();
      if (!pdfUrl) { showToast("error", "请填写PDF链接或上传文件"); return; }
      fileType = pdfUrl.split(".").pop().toLowerCase();
    }

    var data = {
      language: D.manual_language.value,
      type: D.manual_type.value,
      title: D.manual_title.value.trim(),
      pdfUrl: pdfUrl,
      fileType: fileType,
      fileSize: fileSize,
    };

    // 自动生成标题
    if (!data.title) {
      var lang = PMQRStore.getLanguageByCode(data.language);
      var type = PMQRStore.getManualTypeByCode(data.type);
      data.title = type.name + " - " + (lang ? lang.name : data.language);
    }

    if (currentEditManualId) {
      PMQRStore.updateManual(currentEditProductId, currentEditManualId, data);
      showToast("success", "说明书已更新");
    } else {
      PMQRStore.addManual(currentEditProductId, data);
      showToast("success", "说明书已添加");
    }

    D.manual_modal.classList.remove("active");
    renderManualList();
    renderAll();
  }

  /* ---------- 文件上传 ---------- */
  function switchUploadMode(mode) {
    if (mode === "upload") {
      D.tab_upload.classList.add("active");
      D.tab_link.classList.remove("active");
      D.upload_area.style.display = "block";
      D.link_area.style.display = "none";
    } else {
      D.tab_upload.classList.remove("active");
      D.tab_link.classList.add("active");
      D.upload_area.style.display = "none";
      D.link_area.style.display = "block";
      // 切换到链接模式时隐藏翻译区域
      if (D.auto_translate_section) D.auto_translate_section.style.display = "none";
    }
  }

  function resetUploadState() {
    uploadedFileUrl = "";
    uploadedFileType = "";
    uploadedFileSize = 0;
    if (D.file_input) D.file_input.value = "";
    if (D.file_info) D.file_info.style.display = "none";
    if (D.upload_progress) D.upload_progress.style.display = "none";
    if (D.upload_progress_bar) D.upload_progress_bar.style.width = "0%";
    if (D.file_drop_zone) D.file_drop_zone.style.display = "block";
    // 隐藏自动翻译区域
    if (D.auto_translate_section) D.auto_translate_section.style.display = "none";
    if (D.translate_progress) D.translate_progress.style.display = "none";
    if (D.translate_results) D.translate_results.style.display = "none";
    if (D.translate_progress_bar) D.translate_progress_bar.style.width = "0%";
  }

  function handleFileSelect(e) {
    var file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    var ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "doc", "docx"].includes(ext)) {
      showToast("error", "仅支持 PDF、DOC、DOCX 文件");
      D.file_input.value = "";
      return;
    }

    // 验证文件大小 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      showToast("error", "文件大小不能超过 100MB");
      return;
    }

    if (!PMQRStore.isServerMode()) {
      showToast("warning", "请先启动服务器 (node server.js) 才能上传文件。或切换到「粘贴链接」模式。");
      switchUploadMode("link");
      return;
    }

    // 开始上传
    D.file_drop_zone.style.display = "none";
    D.upload_progress.style.display = "block";
    D.upload_progress_bar.style.width = "0%";
    D.upload_progress_text.textContent = "上传中... 0%";

    PMQRStore.uploadFile(file, currentEditProductId, function (percent) {
      D.upload_progress_bar.style.width = percent + "%";
      D.upload_progress_text.textContent = "上传中... " + percent + "%";
    }, function (err, result) {
      if (err) {
        showToast("error", "上传失败: " + err.message);
        D.file_drop_zone.style.display = "block";
        D.upload_progress.style.display = "none";
        return;
      }

      uploadedFileUrl = result.url;
      uploadedFileType = result.fileType;
      uploadedFileSize = result.size;

      D.upload_progress.style.display = "none";
      showFileInfo(result.url, result.fileType, result.size);
      showToast("success", "文件上传成功: " + result.filename);
    });
  }

  function showFileInfo(url, fileType, size) {
    D.file_info.style.display = "block";
    D.file_name.textContent = url.split("/").pop() || "已上传文件";
    D.file_size.textContent = formatSize(size) + " · " + (fileType || "").toUpperCase();
    // 显示自动翻译区域（仅对上传的文件且支持文本提取的格式）
    if (D.auto_translate_section && url && url.startsWith("/documents/")) {
      var ext = (fileType || "").toLowerCase();
      if (ext === "pdf" || ext === "docx") {
        D.auto_translate_section.style.display = "block";
        renderTranslateLangList();
      } else {
        D.auto_translate_section.style.display = "none";
      }
    }
  }

  function clearUploadedFile() {
    // 如果有关联的服务器文件，删除它
    if (uploadedFileUrl && uploadedFileUrl.startsWith("/documents/")) {
      PMQRStore.deleteFile(uploadedFileUrl, function () {});
    }
    resetUploadState();
  }

  function formatSize(bytes) {
    if (!bytes) return "未知大小";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ---------- 自动翻译 v2.1 ---------- */

  // 渲染翻译目标语言选择
  function renderTranslateLangList() {
    if (!D.translate_lang_list) return;
    var sourceLang = D.manual_language.value;
    var html = "";
    PMQRStore.LANGUAGES.forEach(function (l) {
      if (l.code === sourceLang) return; // 排除源语言
      var checked = ["en", "ja", "de"].indexOf(l.code) >= 0 ? "checked" : "";
      html += '<label style="display:inline-flex;align-items:center;gap:4px;background:#fff;border:1px solid #d0d7e3;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:0.8rem;user-select:none;">';
      html += '<input type="checkbox" class="translate-lang-cb" value="' + l.code + '" ' + checked + ' style="cursor:pointer;" />';
      html += '<span>' + l.flag + " " + escHtml(l.name) + '</span>';
      html += '</label>';
    });
    D.translate_lang_list.innerHTML = html;
  }

  function updateTranslateLangList() {
    renderTranslateLangList();
  }

  // 处理自动翻译
  function handleAutoTranslate() {
    if (!uploadedFileUrl) {
      showToast("error", "请先上传文件");
      return;
    }
    if (!currentEditProductId) {
      showToast("error", "请先保存产品");
      return;
    }

    // 获取选中的目标语言
    var checkboxes = document.querySelectorAll(".translate-lang-cb:checked");
    var targetLangs = Array.prototype.map.call(checkboxes, function (cb) { return cb.value; });

    if (targetLangs.length === 0) {
      showToast("warning", "请至少选择一个目标语言");
      return;
    }

    var sourceLang = D.manual_language.value;
    var manualTitle = D.manual_title.value.trim();
    var manualType = D.manual_type.value;

    // 禁用按钮，显示进度
    D.btn_auto_translate.disabled = true;
    D.btn_auto_translate.innerHTML = "⏳ 翻译中...";
    D.translate_progress.style.display = "block";
    D.translate_results.style.display = "none";
    D.translate_progress_bar.style.width = "10%";
    D.translate_progress_text.textContent = "正在提取文档文本...";

    // 调用翻译API
    fetch("/api/translate-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl: uploadedFileUrl,
        sourceLanguage: sourceLang,
        targetLanguages: targetLangs,
        productId: currentEditProductId,
        manualTitle: manualTitle,
        manualType: manualType,
      }),
    })
    .then(function (resp) { return resp.json(); })
    .then(function (data) {
      D.translate_progress_bar.style.width = "100%";
      D.translate_progress_text.textContent = "翻译完成！";

      if (!data.success) {
        showToast("error", "翻译失败: " + (data.error || "未知错误"));
        D.translate_progress_text.textContent = "翻译失败: " + (data.error || "未知错误");
        D.btn_auto_translate.disabled = false;
        D.btn_auto_translate.innerHTML = "🚀 开始自动翻译";
        return;
      }

      // 显示翻译结果
      var results = data.translations || [];
      var successCount = 0;
      var failCount = 0;
      var resultHtml = '<div style="font-size:0.8rem;">';

      results.forEach(function (r) {
        if (r.url) {
          successCount++;
          resultHtml += '<div style="background:#e8f5e9;border-radius:6px;padding:6px 10px;margin-bottom:4px;">✅ ' +
            escHtml(PMQRStore.getLanguageByCode(r.language) ? PMQRStore.getLanguageByCode(r.language).name : r.language) +
            ' — <a href="' + r.url + '" target="_blank" style="color:#1a73e8;">查看</a></div>';

          // 自动创建说明书条目
          PMQRStore.addManual(currentEditProductId, {
            language: r.language,
            type: manualType,
            title: r.title || manualTitle,
            pdfUrl: r.url,
            fileType: "html",
            isAutoTranslated: true,
            uploadDate: new Date().toISOString().split("T")[0],
          });
        } else {
          failCount++;
          resultHtml += '<div style="background:#fce4ec;border-radius:6px;padding:6px 10px;margin-bottom:4px;">❌ ' +
            escHtml(PMQRStore.getLanguageByCode(r.language) ? PMQRStore.getLanguageByCode(r.language).name : r.language) +
            ' — ' + escHtml(r.error || "翻译失败") + '</div>';
        }
      });
      resultHtml += "</div>";

      D.translate_results.innerHTML = resultHtml;
      D.translate_results.style.display = "block";
      D.translate_progress_text.textContent = "完成！成功 " + successCount + " 个" + (failCount > 0 ? "，失败 " + failCount + " 个" : "");

      // 恢复按钮
      D.btn_auto_translate.disabled = false;
      D.btn_auto_translate.innerHTML = "🚀 重新翻译";

      if (successCount > 0) {
        showToast("success", "成功翻译为 " + successCount + " 种语言，已自动添加说明书条目");
        renderManualList();
        renderAll();
      } else {
        showToast("error", "所有语言翻译均失败，请检查网络或稍后重试");
      }
    })
    .catch(function (err) {
      console.error("Translate error:", err);
      showToast("error", "翻译请求失败: " + err.message);
      D.translate_progress_text.textContent = "请求失败: " + err.message;
      D.btn_auto_translate.disabled = false;
      D.btn_auto_translate.innerHTML = "🚀 开始自动翻译";
    });
  }

  /* ---------- 二维码模态框 ---------- */
  var currentQRProductId = null;

  function openQRModal(id) {
    var product = PMQRStore.getProduct(id);
    if (!product) return;
    currentQRProductId = id;

    var url = PMQRStore.getProductUrl(id);
    D.qr_product_name.textContent = product.name;
    D.qr_product_model.textContent = product.model || "";
    D.qr_url.textContent = url;

    D.qr_display.innerHTML = '<div class="qr-image-wrapper" id="qr-canvas-wrapper"></div>';
    var wrapper = document.getElementById("qr-canvas-wrapper");

    if (typeof QRCode !== "undefined") {
      new QRCode(wrapper, {
        text: url, width: 256, height: 256,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
    }

    D.qr_modal.classList.add("active");
  }

  function downloadQRCode() {
    if (!currentQRProductId) return;
    var wrapper = document.getElementById("qr-canvas-wrapper");
    if (!wrapper) return;
    var canvas = wrapper.querySelector("canvas");
    var img = wrapper.querySelector("img");
    var src = canvas ? canvas.toDataURL("image/png") : (img ? img.src : null);
    if (!src) { showToast("error", "无法获取二维码"); return; }
    var link = document.createElement("a");
    link.download = "QR_" + currentQRProductId + ".png";
    link.href = src;
    link.click();
    showToast("success", "二维码已下载");
  }

  function printQRCode() {
    if (!currentQRProductId) return;
    var product = PMQRStore.getProduct(currentQRProductId);
    var wrapper = document.getElementById("qr-canvas-wrapper");
    var canvas = wrapper ? wrapper.querySelector("canvas") : null;
    var img = wrapper ? wrapper.querySelector("img") : null;
    var src = canvas ? canvas.toDataURL("image/png") : (img ? img.src : "");
    if (!src) { showToast("error", "无法获取二维码"); return; }

    var html =
      '<div style="text-align:center;padding:40px;">' +
      '<div style="display:inline-block;padding:20px;border:2px solid #000;border-radius:10px;">' +
      '<img src="' + src + '" style="width:256px;height:256px;" /></div>' +
      '<div style="font-size:18px;font-weight:700;margin-top:12px;">' + escHtml(product.name) + '</div>' +
      '<div style="font-size:14px;color:#666;margin-top:4px;">' + escHtml(product.model || "") + '</div>' +
      '<div style="font-size:12px;color:#999;margin-top:8px;">扫码查看产品说明书 / Scan to view manuals</div>' +
      '</div>';

    var w = window.open("", "_blank");
    w.document.write('<html><head><title>打印二维码 - ' + escHtml(product.name) + '</title><style>body{margin:0;font-family:sans-serif;}</style></head><body>' + html + '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 300);
  }

  function previewProductPage() {
    if (!currentQRProductId) return;
    window.open("product.html?id=" + currentQRProductId, "_blank");
  }

  /* ---------- 数据导入导出 ---------- */
  function handleExport() {
    var data = PMQRStore.exportData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.download = "product-manual-data-" + new Date().toISOString().split("T")[0] + ".json";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast("success", "数据已导出");
  }

  function handleImport(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (event) {
      try {
        var data = JSON.parse(event.target.result);
        if (confirm("导入将覆盖当前所有数据，确定继续吗？")) {
          if (PMQRStore.importData(data)) {
            showToast("success", "数据导入成功");
            renderAll();
          } else { showToast("error", "数据格式错误"); }
        }
      } catch (err) { showToast("error", "文件解析失败: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    if (confirm("确定清空所有数据吗？当前所有产品将被删除。")) {
      PMQRStore.clearAllData();
      showToast("success", "数据已清空");
      renderAll();
    }
  }

  /* ---------- 站点配置 ---------- */
  function openConfigModal() {
    var config = PMQRStore.getSiteConfig();
    D.config_brand_name.value = config.brandName || "";
    D.config_brand_sub.value = config.brandSub || "";
    D.config_base_url.value = config.baseUrl || "";
    D.config_footer_text.value = config.footerText || "";
    D.config_footer_link.value = config.footerLink || "";
    D.config_footer_link_text.value = config.footerLinkText || "";
    D.config_modal.classList.add("active");
  }

  function handleConfigSave(e) {
    e.preventDefault();
    PMQRStore.updateSiteConfig({
      brandName: D.config_brand_name.value.trim(),
      brandSub: D.config_brand_sub.value.trim(),
      baseUrl: D.config_base_url.value.trim(),
      footerText: D.config_footer_text.value.trim(),
      footerLink: D.config_footer_link.value.trim(),
      footerLinkText: D.config_footer_link_text.value.trim(),
    });
    showToast("success", "站点配置已保存");
    D.config_modal.classList.remove("active");
    renderAll();
  }

  /* ---------- 通用 ---------- */
  function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(function (m) { m.classList.remove("active"); });
  }

  function showToast(type, message) {
    var icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    var toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span>' + escHtml(message) + '</span>';
    D.toast_container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  function getInitials(name) {
    if (!name) return "?";
    if (/[\u4e00-\u9fa5]/.test(name)) return name.substring(0, 2);
    return name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }

  function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* ---------- 启动 ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
