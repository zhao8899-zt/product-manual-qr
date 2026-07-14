/**
 * ============================================================
 * 扫码落地页逻辑 product.js v2.0
 * 多语言界面 / API数据加载 / PDF/Word文件适配 / 全球访问
 * ============================================================
 */

(function () {
  "use strict";

  var currentProductId = null;
  var currentProduct = null;
  var selectedLanguage = null;
  var uiLanguage = "en"; // 界面语言（用于 i18n）

  /* ---------- DOM 引用 ---------- */
  var D = {};
  function $(id) { return document.getElementById(id); }
  function cacheDom() {
    ["lp-brand-name","lp-brand-sub","lp-product-icon","lp-product-title",
     "lp-product-model","lp-product-desc","lp-language-bar","lp-language-pills",
     "lp-lang-label","lp-manuals-section","lp-section-title","lp-manual-cards",
     "lp-content","lp-footer","lp-loading"
    ].forEach(function (id) {
      D[id.replace(/-/g,"_")] = $(id);
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    cacheDom();
    PMQRStore.init();

    // 显示加载状态
    showLoading();

    // 等待数据加载完成
    PMQRStore.waitForData(function () {
      // 从 URL 获取产品 ID
      var params = new URLSearchParams(window.location.search);
      currentProductId = params.get("id");

      if (!currentProductId) {
        showNoProduct();
        return;
      }

      currentProduct = PMQRStore.getProduct(currentProductId);

      if (!currentProduct) {
        showNotFound();
        return;
      }

      renderPage();
    });
  }

  /* ---------- 加载状态 ---------- */
  function showLoading() {
    if (D.lp_content) {
      D.lp_content.innerHTML =
        '<div class="loading">' +
        '<div class="spinner"></div>' +
        '<div>Loading...</div>' +
        '</div>';
    }
  }

  /* ---------- 渲染页面 ---------- */
  function renderPage() {
    var config = PMQRStore.getSiteConfig();
    var manuals = currentProduct.manuals || [];

    // 检测界面语言
    var availableLangs = getAvailableLanguages();
    uiLanguage = detectUiLanguage(availableLangs);
    var i18n = PMQRStore.getI18N(uiLanguage);

    // 品牌信息
    if (D.lp_brand_name) D.lp_brand_name.textContent = config.brandName || "Product Manual Center";
    if (D.lp_brand_sub) D.lp_brand_sub.textContent = config.brandSub || "PRODUCT MANUAL CENTER";

    // 恢复内容区
    D.lp_content.innerHTML = '';

    // 产品信息卡片
    var productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML =
      '<div class="product-icon">' + getProductEmoji(currentProduct.category) + '</div>' +
      '<div class="product-title" id="lp-product-title"></div>' +
      '<div class="product-model-text" id="lp-product-model"></div>' +
      '<div class="product-desc" id="lp-product-desc"></div>';
    D.lp_content.appendChild(productCard);

    if (availableLangs.length === 0) {
      showNoManuals(i18n);
      return;
    }

    // 默认选中的语言
    selectedLanguage = detectLanguage(availableLangs);

    // 渲染产品信息（受 selectedLanguage 控制）
    renderProductInfo();

    // 语言选择栏
    var langBar = document.createElement('div');
    langBar.className = 'language-bar';
    langBar.innerHTML =
      '<div class="lang-label">🌐 ' + escHtml(i18n.selectLang) + '</div>' +
      '<div class="language-pills" id="lp-language-pills"></div>';
    D.lp_content.appendChild(langBar);

    // 重新获取语言pills容器
    var pillsContainer = document.getElementById('lp-language-pills');
    renderLanguagePills(pillsContainer, availableLangs);

    // 说明书区域
    var manualsSection = document.createElement('div');
    manualsSection.className = 'manuals-section';
    manualsSection.innerHTML =
      '<div class="section-title" id="lp-section-title"></div>' +
      '<div class="manual-cards" id="lp-manual-cards"></div>';
    D.lp_content.appendChild(manualsSection);

    renderManuals();

    // 底部
    renderFooter(config, i18n);
  }

  /* ---------- 渲染产品信息（按 selectedLanguage 多语言） ---------- */
  function renderProductInfo() {
    var titleEl = document.getElementById('lp-product-title');
    var modelEl = document.getElementById('lp-product-model');
    var descEl = document.getElementById('lp-product-desc');
    if (!titleEl) return;

    // 优先取 i18n[selectedLanguage]，回退到当前产品字段
    var i18nMap = currentProduct.i18n || {};
    var langData = i18nMap[selectedLanguage] || {};

    var name = langData.name || currentProduct.name || '';
    var model = langData.model || currentProduct.model || '';
    var desc = langData.description || currentProduct.description || '';

    titleEl.textContent = name;
    modelEl.textContent = model ? ('Model: ' + model) : '';
    descEl.textContent = desc;
  }

  /* ---------- 获取可用语言 ---------- */
  function getAvailableLanguages() {
    var manuals = currentProduct.manuals || [];
    var langCodes = {};
    manuals.forEach(function (m) { langCodes[m.language] = true; });
    return PMQRStore.LANGUAGES.filter(function (l) { return langCodes[l.code]; });
  }

  /* ---------- 语言检测 ---------- */
  function detectLanguage(availableLangs) {
    var browserLang = navigator.language || navigator.userLanguage || "en";
    var exact = availableLangs.find(function (l) {
      return l.code.toLowerCase() === browserLang.toLowerCase();
    });
    if (exact) return exact.code;
    var prefix = browserLang.split("-")[0].toLowerCase();
    var prefixMatch = availableLangs.find(function (l) {
      return l.code.split("-")[0].toLowerCase() === prefix;
    });
    if (prefixMatch) return prefixMatch.code;
    var zh = availableLangs.find(function (l) { return l.code === "zh-CN"; });
    if (zh) return zh.code;
    return availableLangs[0].code;
  }

  function detectUiLanguage(availableLangs) {
    var browserLang = navigator.language || navigator.userLanguage || "en";
    // 精确匹配
    if (PMQRStore.I18N[browserLang]) return browserLang;
    // 前缀匹配
    var prefix = browserLang.split("-")[0];
    var match = Object.keys(PMQRStore.I18N).find(function (code) {
      return code.split("-")[0] === prefix;
    });
    if (match) return match;
    return "en";
  }

  /* ---------- 渲染语言选择 ---------- */
  function renderLanguagePills(container, langs) {
    var html = langs.map(function (l) {
      var active = l.code === selectedLanguage ? ' active' : '';
      return (
        '<button class="lang-pill' + active + '" data-lang="' + l.code + '">' +
        '<span style="margin-right:4px;">' + getFlagEmoji(l.flag) + '</span>' +
        escHtml(l.name) +
        '</button>'
      );
    }).join("");
    container.innerHTML = html;

    container.querySelectorAll('.lang-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        selectedLanguage = this.getAttribute('data-lang');
        container.querySelectorAll('.lang-pill').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        renderProductInfo();
        renderManuals();
      });
    });
  }

  /* ---------- 渲染说明书列表 ---------- */
  function renderManuals() {
    var i18n = PMQRStore.getI18N(uiLanguage);
    var sectionTitle = document.getElementById('lp-section-title');
    var manualCards = document.getElementById('lp-manual-cards');
    if (!sectionTitle || !manualCards) return;

    var manuals = (currentProduct.manuals || []).filter(function (m) {
      return m.language === selectedLanguage;
    });

    var lang = PMQRStore.getLanguageByCode(selectedLanguage);
    sectionTitle.innerHTML = '📄 ' + escHtml(i18n.manuals) +
      ' <span style="font-size:0.8rem;font-weight:400;color:var(--text-secondary);">(' + manuals.length + ')</span>';

    if (manuals.length === 0) {
      manualCards.innerHTML =
        '<div class="landing-empty" style="padding:var(--space-lg);">' +
        '<div class="empty-icon" style="font-size:2.5rem;">📄</div>' +
        '<div class="empty-text">' + escHtml(i18n.noManuals) + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-light);">' + escHtml(i18n.noManualsSub) + '</div>' +
        '</div>';
      return;
    }

    // 按类型排序
    var typeOrder = ["installation", "usage", "after-sales", "safety"];
    manuals.sort(function (a, b) {
      var ai = typeOrder.indexOf(a.type);
      var bi = typeOrder.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    var html = manuals.map(function (m) {
      var type = PMQRStore.getManualTypeByCode(m.type);
      var typeClass = 'manual-type-' + m.type;
      var typeName = type ? type.name : m.type;
      var emoji = type ? type.emoji : '📄';

      // 获取文件查看URL（自动处理PDF/Word/HTML）
      var viewerUrl = PMQRStore.getFileViewerUrl(m.pdfUrl, m.fileType);
      var fileExt = (m.fileType || '').toUpperCase() || 'PDF';
      var isWord = m.fileType === 'doc' || m.fileType === 'docx';
      var isHtml = m.fileType === 'html';
      var aiBadge = m.isAutoTranslated ? ' <span style="font-size:0.65rem;background:#f3e8ff;color:#7c3aed;padding:1px 6px;border-radius:8px;margin-left:4px;">AI</span>' : '';

      // 动作文字
      var actionText = isWord ? i18n.viewDoc : i18n.viewDoc;

      return (
        '<a class="manual-card ' + typeClass + '" href="' + escHtml(viewerUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<div class="manual-icon">' + emoji + '</div>' +
        '<div class="manual-info">' +
        '<div class="manual-name">' + escHtml(m.title || typeName) + aiBadge + '</div>' +
        '<div class="manual-meta">' + escHtml(typeName) + ' · ' + fileExt + ' · ' + escHtml(m.uploadDate || '') + '</div>' +
        '</div>' +
        '<div class="manual-action">↗</div>' +
        '</a>'
      );
    }).join("");

    manualCards.innerHTML = html;
  }

  /* ---------- 底部 ---------- */
  function renderFooter(config, i18n) {
    var footer = document.querySelector('.landing-footer');
    if (!footer) return;
    var html = escHtml(config.footerText || i18n.scanTip);
    if (config.footerLink && config.footerLinkText) {
      html += '<br><a href="' + escHtml(config.footerLink) + '" target="_blank" rel="noopener">' + escHtml(config.footerLinkText) + '</a>';
    }
    footer.innerHTML = html;
  }

  /* ---------- 空状态 ---------- */
  function showNoProduct() {
    var i18n = PMQRStore.getI18n(detectUiLanguage([]));
    if (D.lp_content) {
      D.lp_content.innerHTML =
        '<div class="landing-empty">' +
        '<div class="empty-icon">🔍</div>' +
        '<div class="empty-text" style="font-size:1.1rem;font-weight:600;">' + escHtml(i18n.noProduct) + '</div>' +
        '<div style="font-size:0.875rem;color:var(--text-secondary);margin-top:8px;">' + escHtml(i18n.noProductDesc) + '</div>' +
        '</div>';
    }
  }

  function showNotFound() {
    var i18n = PMQRStore.getI18N(detectUiLanguage([]));
    if (D.lp_content) {
      D.lp_content.innerHTML =
        '<div class="landing-empty">' +
        '<div class="empty-icon">🔍</div>' +
        '<div class="empty-text" style="font-size:1.1rem;font-weight:600;">' + escHtml(i18n.notFound) + '</div>' +
        '<div style="font-size:0.875rem;color:var(--text-secondary);margin-top:8px;">' + escHtml(i18n.notFoundDesc) + '</div>' +
        '</div>';
    }
  }

  function showNoManuals(i18n) {
    if (D.lp_content) {
      D.lp_content.innerHTML =
        '<div class="landing-empty">' +
        '<div class="empty-icon">📄</div>' +
        '<div class="empty-text">' + escHtml(i18n.noManuals) + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-light);margin-top:8px;">' + escHtml(i18n.contactSupport) + '</div>' +
        '</div>';
    }
  }

  /* ---------- 工具方法 ---------- */
  function getProductEmoji(category) {
    var map = {
      "智能家居": "🤖", "Smart Home": "🤖",
      "音频设备": "🔊", "Audio": "🔊",
      "厨房电器": "🍳", "Kitchen": "🍳",
      "个人护理": "✂️", "照明设备": "💡",
      "安防设备": "🔒", "电脑数码": "💻",
      "运动健康": "🏋️", "照明": "💡",
    };
    if (category && map[category]) return map[category];
    return "📦";
  }

  function getFlagEmoji(countryCode) {
    var map = {
      CN: "🇨🇳", TW: "🇹🇼", US: "🇺🇸", JP: "🇯🇵", KR: "🇰🇷",
      FR: "🇫🇷", DE: "🇩🇪", ES: "🇪🇸", RU: "🇷🇺", PT: "🇵🇹",
      IT: "🇮🇹", SA: "🇸🇦", TH: "🇹🇭", VN: "🇻🇳",
    };
    return map[countryCode] || "";
  }

  function escHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* ---------- 启动 ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
