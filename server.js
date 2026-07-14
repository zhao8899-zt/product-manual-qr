/**
 * ============================================================
 * 产品说明书二维码管理系统 - 后端服务器
 * 支持文件上传 / 数据共享 / 多语言 / 全球访问
 * ============================================================
 */

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

// ---------- 中间件 ----------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(__dirname, {
  maxAge: "1h",
  setHeaders: (res, filePath) => {
    // PDF 和 Word 文件不缓存（确保更新及时）
    if (/\.(pdf|doc|docx)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

// ---------- 数据文件 ----------
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
const DOCUMENTS_DIR = path.join(__dirname, "documents");

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DOCUMENTS_DIR)) fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

// 演示数据
const DEMO_DATA = {
  siteConfig: {
    brandName: "Product Manual Center",
    brandSub: "PRODUCT MANUAL CENTER",
    baseUrl: "",
    footerText: "Scan QR code to view product manuals",
    footerLink: "",
    footerLinkText: "",
  },
  products: [
    {
      id: "p001",
      name: "Smart Robot Vacuum X1 Pro",
      model: "X1-Pro",
      category: "Smart Home",
      description: "LiDAR navigation robot vacuum with mop function",
      createdAt: "2026-07-10T10:00:00Z",
      manuals: [
        { id: "m001", language: "zh-CN", type: "installation", title: "安装指南 - 简体中文", pdfUrl: "", uploadDate: "2026-07-10", fileType: "" },
        { id: "m002", language: "zh-CN", type: "usage", title: "使用说明书 - 简体中文", pdfUrl: "", uploadDate: "2026-07-10", fileType: "" },
        { id: "m003", language: "en", type: "usage", title: "User Manual - English", pdfUrl: "", uploadDate: "2026-07-10", fileType: "" },
        { id: "m004", language: "ja", type: "usage", title: "取扱説明書 - 日本語", pdfUrl: "", uploadDate: "2026-07-10", fileType: "" },
      ],
    },
    {
      id: "p002",
      name: "Portable Bluetooth Speaker M3",
      model: "M3-Mini",
      category: "Audio",
      description: "IPX7 waterproof Bluetooth 5.3 speaker, 24h battery",
      createdAt: "2026-07-11T14:00:00Z",
      manuals: [
        { id: "m011", language: "zh-CN", type: "usage", title: "使用说明书 - 简体中文", pdfUrl: "", uploadDate: "2026-07-11", fileType: "" },
        { id: "m012", language: "en", type: "usage", title: "User Manual - English", pdfUrl: "", uploadDate: "2026-07-11", fileType: "" },
        { id: "m013", language: "de", type: "usage", title: "Bedienungsanleitung - Deutsch", pdfUrl: "", uploadDate: "2026-07-11", fileType: "" },
      ],
    },
  ],
};

// ---------- 数据读写 ----------
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
    // 首次运行，写入演示数据
    saveData(DEMO_DATA);
    return DEMO_DATA;
  } catch (e) {
    console.error("[ERROR] Failed to load data:", e.message);
    return DEMO_DATA;
  }
}

function saveData(data) {
  try {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, DATA_FILE); // 原子写入
    return true;
  } catch (e) {
    console.error("[ERROR] Failed to save data:", e.message);
    return false;
  }
}

// ---------- 文件上传配置 ----------
// 先存到临时目录，路由处理时再移动到正确位置
const TMP_DIR = path.join(DOCUMENTS_DIR, "_tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 确保 _tmp 目录存在（防止被清理后上传失败）
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    const timestamp = Date.now().toString(36);
    cb(null, base + "_" + timestamp + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX files are allowed. Received: " + ext));
    }
  },
});

// ---------- API 路由 ----------

// 获取所有数据
app.get("/api/data", (req, res) => {
  const data = loadData();
  res.json(data);
});

// 保存所有数据
app.put("/api/data", (req, res) => {
  const success = saveData(req.body);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: "Failed to save data" });
  }
});

// 上传文件
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // 确保 _tmp 目录存在（防止被清理后上传失败）
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const productId = req.query.productId || req.body.productId || "general";
  const ext = path.extname(req.file.originalname).toLowerCase();

  // 将文件从临时目录移动到产品目录
  const targetDir = path.join(DOCUMENTS_DIR, productId);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.join(targetDir, req.file.filename);
  try {
    fs.renameSync(req.file.path, targetPath);
  } catch (e) {
    // 如果 rename 失败（跨盘符），尝试 copy + unlink
    fs.copyFileSync(req.file.path, targetPath);
    fs.unlinkSync(req.file.path);
  }

  const fileUrl = "/documents/" + productId + "/" + req.file.filename;

  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.originalname,
    savedAs: req.file.filename,
    size: req.file.size,
    fileType: ext.replace(".", ""),
  });
});

// 删除文件
app.delete("/api/file", (req, res) => {
  const filePath = req.query.path;
  if (!filePath) {
    return res.status(400).json({ error: "No file path provided" });
  }

  // 安全检查：只允许删除 documents 目录下的文件
  const resolvedPath = path.resolve(__dirname, filePath);
  const docResolved = path.resolve(DOCUMENTS_DIR);
  if (!resolvedPath.startsWith(docResolved)) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// ---------- 自动翻译功能 ----------

// 语言代码映射（系统语言代码 → 翻译API语言代码）
const LANG_NAMES = {
  "zh-CN": "简体中文", "zh-TW": "繁體中文", "en": "English", "ja": "日本語",
  "ko": "한국어", "fr": "Français", "de": "Deutsch", "es": "Español",
  "ru": "Русский", "pt": "Português", "it": "Italiano", "ar": "العربية",
  "th": "ภาษาไทย", "vi": "Tiếng Việt",
};

// 说明书类型多语言映射
const MANUAL_TYPE_NAMES = {
  installation: { "zh-CN": "安装指南", "zh-TW": "安裝指南", "en": "Installation Guide", "ja": "設置ガイド", "ko": "설치 가이드", "fr": "Guide d'installation", "de": "Installationsanleitung", "es": "Guía de instalación", "ru": "Руководство по установке", "pt": "Guia de instalação", "it": "Guida all'installazione", "ar": "دليل التركيب", "th": "คู่มือการติดตั้ง", "vi": "Hướng dẫn lắp đặt" },
  usage: { "zh-CN": "使用说明书", "zh-TW": "使用說明書", "en": "User Manual", "ja": "取扱説明書", "ko": "사용 설명서", "fr": "Manuel d'utilisation", "de": "Bedienungsanleitung", "es": "Manual de usuario", "ru": "Руководство пользователя", "pt": "Manual do usuário", "it": "Manuale utente", "ar": "دليل المستخدم", "th": "คู่มือการใช้งาน", "vi": "Hướng dẫn sử dụng" },
  afterSales: { "zh-CN": "售后服务", "zh-TW": "售後服務", "en": "After-Sales Service", "ja": "アフターサービス", "ko": "A/S 서비스", "fr": "Service après-vente", "de": "Kundendienst", "es": "Servicio postventa", "ru": "Послепродажное обслуживание", "pt": "Serviço pós-venda", "it": "Servizio post-vendita", "ar": "خدمة ما بعد البيع", "th": "บริการหลังการขาย", "vi": "Dịch vụ hậu mãi" },
  safety: { "zh-CN": "安规认证", "zh-TW": "安規認證", "en": "Safety & Compliance", "ja": "安全規格", "ko": "안전 인증", "fr": "Sécurité et conformité", "de": "Sicherheit & Konformität", "es": "Seguridad y cumplimiento", "ru": "Безопасность и соответствие", "pt": "Segurança e conformidade", "it": "Sicurezza e conformità", "ar": "السلامة والامتثال", "th": "ความปลอดภัยและการปฏิบัติตาม", "vi": "An toàn và tuân thủ" },
};

// AI翻译声明多语言
const TRANSLATE_NOTICE = {
  "zh-CN": "本文档由 AI 自动翻译，仅供参考。如有疑问请以原文档为准。", "zh-TW": "本文檔由 AI 自動翻譯，僅供參考。如有疑問請以原文檔為準。", "en": "This document was automatically translated by AI for reference only. Please refer to the original document for authoritative content.", "ja": "このドキュメントはAIによって自動翻訳されています。参考用です。正確な内容は原文書をご確認ください。", "ko": "이 문서는 AI에 의해 자동 번역되었으며 참고용입니다. 정확한 내용은 원본 문서를 참조하십시오.", "fr": "Ce document a été automatiquement traduit par IA, à titre indicatif uniquement.", "de": "Dieses Dokument wurde automatisch von KI übersetzt, nur als Referenz.", "es": "Este documento fue traducido automáticamente por IA, solo como referencia.", "ru": "Этот документ был автоматически переведен ИИ, только для справки.", "pt": "Este documento foi traduzido automaticamente por IA, apenas como referência.", "it": "Questo documento è stato tradotto automaticamente dall'IA, solo come riferimento.", "ar": "تمت ترجمة هذه الوثيقة تلقائياً بواسطة الذكاء الاصطناعي، للمرجعية فقط.", "th": "เอกสารนี้ถูกแปลโดยอัตโนมัติโดย AI เพื่อใช้เป็นข้อมูลอ้างอิงเท่านั้น", "vi": "Tài liệu này được dịch tự động bởi AI, chỉ dùng làm tài liệu tham khảo.",
};

// 将文本按最大长度分块
function splitTextIntoChunks(text, maxLength) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  const paragraphs = text.split("\n");
  let currentChunk = "";
  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 1 > maxLength) {
      if (currentChunk) chunks.push(currentChunk);
      // 如果单段超长，按句号切分
      if (para.length > maxLength) {
        const sentences = para.split(/(?<=[.。！！？？])/);
        for (const s of sentences) {
          if (currentChunk.length + s.length > maxLength) {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = s;
          } else {
            currentChunk += s;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? "\n" : "") + para;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// 使用 MyMemory API 翻译（免费，无需API Key）
async function translateWithMyMemory(text, from, to) {
  const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + from + "|" + to + "&de=" + encodeURIComponent("translator@productmanual.local");
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.responseStatus === 200 || (data.responseData && data.responseData.translatedText)) {
    return data.responseData.translatedText;
  }
  throw new Error("MyMemory error: " + (data.responseDetails || "unknown"));
}

// 使用 Google Translate 免费端点翻译
async function translateWithGoogle(text, from, to) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + from + "&tl=" + to + "&dt=t&q=" + encodeURIComponent(text);
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (ProductManualQR/2.0)" },
  });
  const data = await resp.json();
  let translated = "";
  if (data && data[0]) {
    for (const seg of data[0]) {
      if (seg && seg[0]) translated += seg[0];
    }
  }
  if (!translated) throw new Error("Google Translate returned empty");
  return translated;
}

// 多API回退翻译
async function translateText(text, from, to) {
  if (!text || text.trim().length === 0) return "";
  if (from === to) return text;

  const chunks = splitTextIntoChunks(text, 4000);
  const results = [];

  for (const chunk of chunks) {
    let translated = null;
    // 先尝试 MyMemory
    try {
      translated = await translateWithMyMemory(chunk, from, to);
    } catch (e) {
      console.log("[TRANSLATE] MyMemory failed for chunk, trying Google:", e.message);
    }
    // 回退到 Google Translate
    if (!translated) {
      try {
        translated = await translateWithGoogle(chunk, from, to);
      } catch (e) {
        console.error("[TRANSLATE] Google also failed:", e.message);
        translated = chunk; // 保留原文作为最后兜底
      }
    }
    results.push(translated);
    // 间隔500ms避免API限流
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 500));
  }

  return results.join("\n");
}

// 从PDF/Word文件中提取文本
async function extractTextFromDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const { PDFParse } = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    const result = await parser.getText();
    return { text: result.text || "", title: "" };
  } else if (ext === ".docx") {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: filePath });
    return { text: result.value || "", title: "" };
  } else if (ext === ".doc") {
    // .doc 格式暂不支持文本提取，提示用户转为 .docx
    throw new Error("DOC format is not supported for translation. Please convert to DOCX.");
  } else {
    throw new Error("Unsupported file type: " + ext);
  }
}

// 生成翻译后的HTML文档
function generateTranslatedHtml(originalTitle, translatedTitle, content, langCode, langName, type) {
  const typeName = (MANUAL_TYPE_NAMES[type] && MANUAL_TYPE_NAMES[type][langCode]) || type;
  const notice = TRANSLATE_NOTICE[langCode] || TRANSLATE_NOTICE["en"];
  const isRtl = langCode === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  return `<!DOCTYPE html>
<html lang="${langCode}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(translatedTitle)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP","Noto Sans KR","Noto Sans SC","Noto Sans Arabic",sans-serif;max-width:800px;margin:0 auto;padding:30px 20px;line-height:1.8;color:#2c3e50;background:#fafbfc}
.header{text-align:center;padding:25px 0;border-bottom:2px solid #e8ecf1;margin-bottom:25px}
.header h1{font-size:22px;color:#1a73e8;margin-bottom:8px}
.header .type-badge{display:inline-block;background:#e8f0fe;color:#1a73e8;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600}
.translate-notice{background:#fff8e1;border:1px solid #ffe082;padding:12px 18px;border-radius:10px;font-size:13px;color:#7c6f00;margin-bottom:25px;line-height:1.6}
.content{background:#fff;border:1px solid #e8ecf1;border-radius:12px;padding:30px;font-size:15px;white-space:pre-wrap;word-wrap:break-word;min-height:200px}
.content p{margin-bottom:12px}
.footer{text-align:center;padding:20px 0;margin-top:30px;color:#999;font-size:12px;border-top:1px solid #e8ecf1}
@media(max-width:600px){body{padding:15px}.content{padding:20px}.header h1{font-size:18px}}
</style>
</head>
<body>
<div class="header">
<h1>${escapeHtml(translatedTitle)}</h1>
<span class="type-badge">${escapeHtml(typeName)}</span>
</div>
<div class="translate-notice">⚠️ ${escapeHtml(notice)}</div>
<div class="content">${escapeHtml(content).replace(/\n/g, "</p><p>")}</div>
<div class="footer">Product Manual QR System · Auto-translated from ${escapeHtml(LANG_NAMES["zh-CN"] || "original")}</div>
</body>
</html>`;
}

// HTML转义
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 生成唯一ID
function generateId() {
  return "m" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// 翻译文本（用于标题等短文本）
app.post("/api/translate-text", async (req, res) => {
  const { text, from, targets } = req.body;
  if (!text || !from || !targets || !Array.isArray(targets)) {
    return res.status(400).json({ error: "Missing required fields: text, from, targets" });
  }
  try {
    const translations = {};
    for (const target of targets) {
      if (target === from) {
        translations[target] = text;
        continue;
      }
      translations[target] = await translateText(text, from, target);
    }
    res.json({ success: true, translations });
  } catch (e) {
    console.error("[TRANSLATE-TEXT] Error:", e.message);
    res.status(500).json({ error: "Translation failed: " + e.message });
  }
});

// 翻译文档（提取→翻译→生成HTML→返回结果）
app.post("/api/translate-document", async (req, res) => {
  const { fileUrl, sourceLanguage, targetLanguages, productId, manualTitle, manualType } = req.body;

  if (!fileUrl || !sourceLanguage || !targetLanguages || !Array.isArray(targetLanguages)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. 解析文件路径
    const filePath = path.resolve(__dirname, fileUrl.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found: " + fileUrl });
    }

    // 2. 提取文本
    console.log("[TRANSLATE-DOC] Extracting text from:", filePath);
    const extracted = await extractTextFromDocument(filePath);
    if (!extracted.text || extracted.text.trim().length === 0) {
      return res.status(400).json({ error: "No text could be extracted from the document. If this is a scanned PDF, please upload a text-based PDF." });
    }
    console.log("[TRANSLATE-DOC] Extracted " + extracted.text.length + " characters");

    // 3. 翻译标题
    const titleToTranslate = manualTitle || extracted.title || "Product Manual";

    // 4. 确保产品目录存在
    const productDir = path.join(DOCUMENTS_DIR, productId || "general");
    if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

    // 5. 逐语言翻译
    const results = [];
    for (const targetLang of targetLanguages) {
      if (targetLang === sourceLanguage) continue;
      console.log("[TRANSLATE-DOC] Translating to:", targetLang);

      try {
        const translatedTitle = await translateText(titleToTranslate, sourceLanguage, targetLang);
        const translatedContent = await translateText(extracted.text, sourceLanguage, targetLang);

        // 生成HTML文件
        const htmlFileName = "translated_" + targetLang + "_" + Date.now().toString(36) + ".html";
        const htmlFilePath = path.join(productDir, htmlFileName);
        const htmlContent = generateTranslatedHtml(
          titleToTranslate, translatedTitle, translatedContent,
          targetLang, LANG_NAMES[targetLang] || targetLang, manualType || "usage"
        );
        fs.writeFileSync(htmlFilePath, htmlContent, "utf-8");

        const htmlUrl = "/documents/" + (productId || "general") + "/" + htmlFileName;
        results.push({
          language: targetLang,
          title: translatedTitle,
          url: htmlUrl,
          fileType: "html",
          isAutoTranslated: true,
        });
        console.log("[TRANSLATE-DOC] Done:", targetLang, "→", htmlUrl);
      } catch (e) {
        console.error("[TRANSLATE-DOC] Failed for", targetLang, ":", e.message);
        results.push({
          language: targetLang,
          title: null,
          url: null,
          error: e.message,
        });
      }
    }

    res.json({ success: true, translations: results, sourceLanguage, extractedLength: extracted.text.length });
  } catch (e) {
    console.error("[TRANSLATE-DOC] Error:", e.message);
    res.status(500).json({ error: "Document translation failed: " + e.message });
  }
});

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ---------- 启动服务器 ----------
app.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("  Product Manual QR System v2.0");
  console.log("========================================");
  console.log("");
  console.log("  Admin Panel:  http://localhost:" + PORT);
  console.log("  API Health:   http://localhost:" + PORT + "/api/health");
  console.log("");
  console.log("  Data file:    " + DATA_FILE);
  console.log("  Documents:    " + DOCUMENTS_DIR);
  console.log("");
  console.log("  Press Ctrl+C to stop");
  console.log("");
});
