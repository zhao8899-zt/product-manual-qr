/**
 * ============================================================
 * Netlify Function: API Handler for Product Manual QR System
 * Handles all /api/* routes using GitHub API for data persistence
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ---------- Config ----------
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "zhao8899-zt";
const GITHUB_REPO = process.env.GITHUB_REPO || "product-manual-qr";
const GITHUB_BRANCH = "main";
const RAW_BASE = "https://raw.githubusercontent.com/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/" + GITHUB_BRANCH;
const GITHUB_API = "https://api.github.com";

// ---------- CORS ----------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(code, data) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(data),
  };
}

// ---------- GitHub API helpers ----------
async function ghGet(filePath) {
  try {
    const resp = await fetch(
      GITHUB_API + "/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + filePath + "?ref=" + GITHUB_BRANCH,
      { headers: { Authorization: "token " + GITHUB_TOKEN, Accept: "application/vnd.github.v3+json" } }
    );
    if (!resp.ok) return null;
    return resp.json();
  } catch (e) {
    console.error("[GH GET] Error:", e.message);
    return null;
  }
}

async function ghPut(filePath, content, sha, message) {
  const body = {
    message: message || "Update " + filePath,
    content: Buffer.from(content).toString("base64"),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  const resp = await fetch(
    GITHUB_API + "/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + filePath,
    {
      method: "PUT",
      headers: { Authorization: "token " + GITHUB_TOKEN, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(function () { return {}; });
    throw new Error("GitHub write failed: " + (err.message || resp.statusText));
  }
  return resp.json();
}

async function ghDelete(filePath, sha) {
  const resp = await fetch(
    GITHUB_API + "/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + filePath,
    {
      method: "DELETE",
      headers: { Authorization: "token " + GITHUB_TOKEN, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Delete " + filePath, sha: sha, branch: GITHUB_BRANCH }),
    }
  );
  return resp.ok;
}

// ---------- Language mappings ----------
var LANG_NAMES = {
  "zh-CN": "简体中文", "zh-TW": "繁體中文", "en": "English", "ja": "日本語",
  "ko": "한국어", "fr": "Français", "de": "Deutsch", "es": "Español",
  "ru": "Русский", "pt": "Português", "it": "Italiano", "ar": "العربية",
  "th": "ภาษาไทย", "vi": "Tiếng Việt",
};

var MANUAL_TYPE_NAMES = {
  installation: { "zh-CN": "安装指南", "zh-TW": "安裝指南", "en": "Installation Guide", "ja": "設置ガイド", "ko": "설치 가이드", "fr": "Guide d'installation", "de": "Installationsanleitung", "es": "Guía de instalación", "ru": "Руководство по установке", "pt": "Guia de instalação", "it": "Guida all'installazione", "ar": "دليل التركيب", "th": "คู่มือการติดตั้ง", "vi": "Hướng dẫn lắp đặt" },
  usage: { "zh-CN": "使用说明书", "zh-TW": "使用說明書", "en": "User Manual", "ja": "取扱説明書", "ko": "사용 설명서", "fr": "Manuel d'utilisation", "de": "Bedienungsanleitung", "es": "Manual de usuario", "ru": "Руководство пользователя", "pt": "Manual do usuário", "it": "Manuale utente", "ar": "دليل المستخدم", "th": "คู่มือการใช้งาน", "vi": "Hướng dẫn sử dụng" },
  afterSales: { "zh-CN": "售后服务", "zh-TW": "售後服務", "en": "After-Sales Service", "ja": "アフターサービス", "ko": "A/S 서비스", "fr": "Service après-vente", "de": "Kundendienst", "es": "Servicio postventa", "ru": "Послепродажное обслуживание", "pt": "Serviço pós-venda", "it": "Servizio post-vendita", "ar": "خدمة ما بعد البيع", "th": "บริการหลังการขาย", "vi": "Dịch vụ hậu mãi" },
  safety: { "zh-CN": "安规认证", "zh-TW": "安規認證", "en": "Safety & Compliance", "ja": "安全規格", "ko": "안전 인증", "fr": "Sécurité et conformité", "de": "Sicherheit & Konformität", "es": "Seguridad y cumplimiento", "ru": "Безопасность и соответствие", "pt": "Segurança e conformidade", "it": "Sicurezza e conformità", "ar": "السلامة والامتثال", "th": "ความปลอดภัยและการปฏิบัติตาม", "vi": "An toàn và tuân thủ" },
};

var TRANSLATE_NOTICE = {
  "zh-CN": "本文档由 AI 自动翻译，仅供参考。如有疑问请以原文档为准。", "zh-TW": "本文檔由 AI 自動翻譯，僅供參考。如有疑問請以原文檔為準。", "en": "This document was automatically translated by AI for reference only. Please refer to the original document for authoritative content.", "ja": "このドキュメントはAIによって自動翻訳されています。参考用です。正確な内容は原文書をご確認ください。", "ko": "이 문서는 AI에 의해 자동 번역되었으며 참고용입니다. 정확한 내용은 원본 문서를 참조하십시오.", "fr": "Ce document a été automatiquement traduit par IA, à titre indicatif uniquement.", "de": "Dieses Dokument wurde automatisch von KI übersetzt, nur als Referenz.", "es": "Este documento fue traducido automáticamente por IA, solo como referencia.", "ru": "Этот документ был автоматически переведен ИИ, только для справки.", "pt": "Este documento foi traduzido automaticamente por IA, apenas como referência.", "it": "Questo documento è stato tradotto automaticamente dall'IA, solo come riferimento.", "ar": "تمت ترجمة هذه الوثيقة تلقائياً بواسطة الذكاء الاصطناعي، للمرجعية فقط.", "th": "เอกสารนี้ถูกแปลโดยอัตโนมัติโดย AI เพื่อใช้เป็นข้อมูลอ้างอิงเท่านั้น", "vi": "Tài liệu này được dịch tự động bởi AI, chỉ dùng làm tài liệu tham khảo.",
};

// ---------- Translation helpers ----------
function splitTextIntoChunks(text, maxLength) {
  if (text.length <= maxLength) return [text];
  var chunks = [];
  var paragraphs = text.split("\n");
  var currentChunk = "";
  for (var i = 0; i < paragraphs.length; i++) {
    var para = paragraphs[i];
    if (currentChunk.length + para.length + 1 > maxLength) {
      if (currentChunk) chunks.push(currentChunk);
      if (para.length > maxLength) {
        var sentences = para.split(/(?<=[.。！！？？])/);
        for (var j = 0; j < sentences.length; j++) {
          var s = sentences[j];
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

async function translateWithMyMemory(text, from, to) {
  var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(text) + "&langpair=" + from + "|" + to + "&de=" + encodeURIComponent("translator@productmanual.local");
  var resp = await fetch(url);
  var data = await resp.json();
  if (data.responseStatus === 200 || (data.responseData && data.responseData.translatedText)) {
    return data.responseData.translatedText;
  }
  throw new Error("MyMemory error: " + (data.responseDetails || "unknown"));
}

async function translateWithGoogle(text, from, to) {
  var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + from + "&tl=" + to + "&dt=t&q=" + encodeURIComponent(text);
  var resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (ProductManualQR/2.0)" } });
  var data = await resp.json();
  var translated = "";
  if (data && data[0]) {
    for (var i = 0; i < data[0].length; i++) {
      if (data[0][i] && data[0][i][0]) translated += data[0][i][0];
    }
  }
  if (!translated) throw new Error("Google Translate returned empty");
  return translated;
}

async function translateText(text, from, to) {
  if (!text || text.trim().length === 0) return "";
  if (from === to) return text;
  var chunks = splitTextIntoChunks(text, 4000);
  var results = [];
  for (var i = 0; i < chunks.length; i++) {
    var chunk = chunks[i];
    var translated = null;
    try {
      translated = await translateWithMyMemory(chunk, from, to);
    } catch (e) {
      console.log("[TRANSLATE] MyMemory failed:", e.message);
    }
    if (!translated) {
      try {
        translated = await translateWithGoogle(chunk, from, to);
      } catch (e) {
        console.error("[TRANSLATE] Google also failed:", e.message);
        translated = chunk;
      }
    }
    results.push(translated);
    if (chunks.length > 1) await new Promise(function (r) { setTimeout(r, 500); });
  }
  return results.join("\n");
}

// ---------- Text extraction ----------
async function extractTextFromDocument(buffer, ext) {
  ext = ext.toLowerCase();
  if (ext === ".pdf") {
    var { PDFParse } = require("pdf-parse");
    var parser = new PDFParse({ data: new Uint8Array(buffer) });
    var result = await parser.getText();
    return { text: result.text || "", title: "" };
  } else if (ext === ".docx") {
    var mammoth = require("mammoth");
    var tmpPath = path.join(os.tmpdir(), "doc_" + Date.now() + ".docx");
    fs.writeFileSync(tmpPath, buffer);
    var result2 = await mammoth.extractRawText({ path: tmpPath });
    try { fs.unlinkSync(tmpPath); } catch (e) {}
    return { text: result2.value || "", title: "" };
  } else if (ext === ".doc") {
    throw new Error("DOC format is not supported for translation. Please convert to DOCX.");
  } else {
    throw new Error("Unsupported file type: " + ext);
  }
}

// ---------- HTML generation ----------
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateTranslatedHtml(originalTitle, translatedTitle, content, langCode, langName, type) {
  var typeName = (MANUAL_TYPE_NAMES[type] && MANUAL_TYPE_NAMES[type][langCode]) || type;
  var notice = TRANSLATE_NOTICE[langCode] || TRANSLATE_NOTICE["en"];
  var isRtl = langCode === "ar";
  var dir = isRtl ? "rtl" : "ltr";
  return '<!DOCTYPE html>\n<html lang="' + langCode + '" dir="' + dir + '">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + escapeHtml(translatedTitle) + '</title>\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP","Noto Sans KR","Noto Sans SC","Noto Sans Arabic",sans-serif;max-width:800px;margin:0 auto;padding:30px 20px;line-height:1.8;color:#2c3e50;background:#fafbfc}\n.header{text-align:center;padding:25px 0;border-bottom:2px solid #e8ecf1;margin-bottom:25px}\n.header h1{font-size:22px;color:#1a73e8;margin-bottom:8px}\n.header .type-badge{display:inline-block;background:#e8f0fe;color:#1a73e8;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600}\n.translate-notice{background:#fff8e1;border:1px solid #ffe082;padding:12px 18px;border-radius:10px;font-size:13px;color:#7c6f00;margin-bottom:25px;line-height:1.6}\n.content{background:#fff;border:1px solid #e8ecf1;border-radius:12px;padding:30px;font-size:15px;white-space:pre-wrap;word-wrap:break-word;min-height:200px}\n.content p{margin-bottom:12px}\n.footer{text-align:center;padding:20px 0;margin-top:30px;color:#999;font-size:12px;border-top:1px solid #e8ecf1}\n@media(max-width:600px){body{padding:15px}.content{padding:20px}.header h1{font-size:18px}}\n</style>\n</head>\n<body>\n<div class="header">\n<h1>' + escapeHtml(translatedTitle) + '</h1>\n<span class="type-badge">' + escapeHtml(typeName) + '</span>\n</div>\n<div class="translate-notice">⚠️ ' + escapeHtml(notice) + '</div>\n<div class="content">' + escapeHtml(content).replace(/\n/g, "</p><p>") + '</div>\n<div class="footer">Product Manual QR System · Auto-translated from ' + escapeHtml(LANG_NAMES["zh-CN"] || "original") + '</div>\n</body>\n</html>';
}

// ---------- Main handler ----------
exports.handler = async function (event, context) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "" };
  }

  // Check config
  if (!GITHUB_TOKEN) {
    return json(500, { error: "GITHUB_TOKEN environment variable is not set. Please set it in Netlify Site Settings > Environment Variables." });
  }

  var apiPath = (event.path || "").replace(/^\/api/, "");

  try {
    // ===== Health check =====
    if (apiPath === "/health" && event.httpMethod === "GET") {
      return json(200, { status: "ok", time: new Date().toISOString(), githubRepo: GITHUB_OWNER + "/" + GITHUB_REPO });
    }

    // ===== Get data =====
    if (apiPath === "/data" && event.httpMethod === "GET") {
      var file = await ghGet("data/products.json");
      if (!file) {
        return json(200, {
          siteConfig: { brandName: "Product Manual Center", brandSub: "PRODUCT MANUAL CENTER", baseUrl: "", footerText: "Scan QR code to view product manuals", footerLink: "", footerLinkText: "" },
          products: [],
        });
      }
      var content = Buffer.from(file.content, "base64").toString("utf-8");
      return json(200, JSON.parse(content));
    }

    // ===== Save data =====
    if (apiPath === "/data" && event.httpMethod === "PUT") {
      var data = JSON.parse(event.body);
      var existing = await ghGet("data/products.json");
      var sha = existing ? existing.sha : undefined;
      await ghPut("data/products.json", JSON.stringify(data, null, 2), sha, "Update product data via admin");
      return json(200, { success: true });
    }

    // ===== Upload file =====
    if (apiPath === "/upload" && event.httpMethod === "POST") {
      var body = JSON.parse(event.body);
      var fileName = body.fileName;
      var fileContent = body.fileContent;
      var productId = body.productId || "general";

      if (!fileName || !fileContent) {
        return json(400, { error: "Missing fileName or fileContent" });
      }

      // Validate file type
      var ext = path.extname(fileName).toLowerCase();
      if ([".pdf", ".doc", ".docx"].indexOf(ext) < 0) {
        return json(400, { error: "Only PDF, DOC, DOCX files are allowed. Received: " + ext });
      }

      // Check size (base64 ~4.5MB limit for Netlify)
      var buffer = Buffer.from(fileContent, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        return json(400, { error: "File too large. Maximum 5MB for cloud deployment." });
      }

      // Sanitize filename
      var base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
      var timestamp = Date.now().toString(36);
      var savedName = base + "_" + timestamp + ext;
      var filePath = "documents/" + productId + "/" + savedName;

      // Write to GitHub
      await ghPut(filePath, buffer, undefined, "Upload " + fileName);
      var fileUrl = RAW_BASE + "/" + filePath;

      return json(200, {
        success: true,
        url: fileUrl,
        filename: fileName,
        savedAs: savedName,
        size: buffer.length,
        fileType: ext.replace(".", ""),
      });
    }

    // ===== Delete file =====
    if (apiPath === "/file" && event.httpMethod === "DELETE") {
      var filePathParam = event.queryStringParameters && event.queryStringParameters.path;
      if (!filePathParam) {
        return json(400, { error: "No file path provided" });
      }

      // Convert URL to GitHub path
      var ghPath = filePathParam;
      if (ghPath.indexOf(RAW_BASE) === 0) {
        ghPath = ghPath.substring(RAW_BASE.length + 1);
      } else if (ghPath.charAt(0) === "/") {
        ghPath = ghPath.replace(/^\//, "");
      }

      var fileInfo = await ghGet(ghPath);
      if (!fileInfo) {
        return json(404, { error: "File not found: " + ghPath });
      }

      await ghDelete(ghPath, fileInfo.sha);
      return json(200, { success: true });
    }

    // ===== Translate text =====
    if (apiPath === "/translate-text" && event.httpMethod === "POST") {
      var reqBody = JSON.parse(event.body);
      var text = reqBody.text;
      var from = reqBody.from;
      var targets = reqBody.targets;

      if (!text || !from || !targets || !Array.isArray(targets)) {
        return json(400, { error: "Missing required fields: text, from, targets" });
      }

      var translations = {};
      for (var i = 0; i < targets.length; i++) {
        var target = targets[i];
        if (target === from) {
          translations[target] = text;
        } else {
          translations[target] = await translateText(text, from, target);
        }
      }
      return json(200, { success: true, translations: translations });
    }

    // ===== Translate document =====
    if (apiPath === "/translate-document" && event.httpMethod === "POST") {
      var tdBody = JSON.parse(event.body);
      var fileUrl = tdBody.fileUrl;
      var sourceLanguage = tdBody.sourceLanguage;
      var targetLanguages = tdBody.targetLanguages;
      var prodId = tdBody.productId;
      var manualTitle = tdBody.manualTitle;
      var manualType = tdBody.manualType;

      if (!fileUrl || !sourceLanguage || !targetLanguages || !Array.isArray(targetLanguages)) {
        return json(400, { error: "Missing required fields" });
      }

      // Convert URL to GitHub path
      var docPath = fileUrl;
      if (docPath.indexOf(RAW_BASE) === 0) {
        docPath = docPath.substring(RAW_BASE.length + 1);
      } else if (docPath.charAt(0) === "/") {
        docPath = docPath.replace(/^\//, "");
      }

      // Read file from GitHub
      var docFile = await ghGet(docPath);
      if (!docFile) {
        return json(404, { error: "File not found: " + docPath });
      }

      var docBuffer = Buffer.from(docFile.content, "base64");
      var docExt = path.extname(docPath);

      // Extract text
      var extracted = await extractTextFromDocument(docBuffer, docExt);
      if (!extracted.text || extracted.text.trim().length === 0) {
        return json(400, { error: "No text could be extracted from the document." });
      }

      var titleToTranslate = manualTitle || extracted.title || "Product Manual";

      // Translate to each target language
      var results = [];
      for (var li = 0; li < targetLanguages.length; li++) {
        var targetLang = targetLanguages[li];
        if (targetLang === sourceLanguage) continue;

        try {
          var translatedTitle = await translateText(titleToTranslate, sourceLanguage, targetLang);
          var translatedContent = await translateText(extracted.text, sourceLanguage, targetLang);

          // Generate HTML
          var htmlFileName = "translated_" + targetLang + "_" + Date.now().toString(36) + ".html";
          var htmlPath = "documents/" + (prodId || "general") + "/" + htmlFileName;
          var htmlContent = generateTranslatedHtml(
            titleToTranslate, translatedTitle, translatedContent,
            targetLang, LANG_NAMES[targetLang] || targetLang, manualType || "usage"
          );

          // Write HTML to GitHub
          await ghPut(htmlPath, htmlContent, undefined, "Auto-translate to " + targetLang);
          var htmlUrl = RAW_BASE + "/" + htmlPath;

          results.push({
            language: targetLang,
            title: translatedTitle,
            url: htmlUrl,
            fileType: "html",
            isAutoTranslated: true,
          });
        } catch (e) {
          results.push({
            language: targetLang,
            title: null,
            url: null,
            error: e.message,
          });
        }
      }

      return json(200, {
        success: true,
        translations: results,
        sourceLanguage: sourceLanguage,
        extractedLength: extracted.text.length,
      });
    }

    // ===== 404 =====
    return json(404, { error: "Not found: " + apiPath });
  } catch (err) {
    console.error("[API] Error:", err.message);
    return json(500, { error: err.message });
  }
};
