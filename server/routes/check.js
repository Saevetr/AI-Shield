    // routes/check.js
const express = require("express");
const router = express.Router();
const pool = require("./db");

// 內部重複使用的簡訊分析函式
async function analyzeMessageText(text) {
  const messageText = String(text || "").trim();
  if (messageText.length < 2) {
    return { success: false, statusCode: 400, message: "Invalid message text" };
  }

  const [keywords] = await pool.query("SELECT id, keyword, level, score, reason FROM message_keywords");
  const matchedKeywords = keywords.filter((item) => {
    const keyword = String(item.keyword || "").trim();
    return keyword && messageText.includes(keyword);
  });

  let level = "low";
  let score = 15;

  if (matchedKeywords.length > 0) {
    const maxScore = Math.max(...matchedKeywords.map((item) => Number(item.score || 0)));
    score = maxScore || 80;
    if (score >= 80) level = "high";
    else if (score >= 50) level = "medium";
    else level = "low";
  }

  const isScam = matchedKeywords.length > 0 && score >= 50;
  const commonResult = {
    isScam, level, score,
    message: isScam ? "此訊息包含疑似詐騙關鍵字，請提高警覺。" : "目前未發現明顯詐騙關鍵字。",
    matchedKeywords,
  };

  return {
    success: true, text: messageText, ...commonResult, data: commonResult,
    detail: { ...commonResult, reason: matchedKeywords.length > 0 ? matchedKeywords.map((item) => item.reason || item.keyword).join("、") : "" }
  };
}

// 1. 電話號碼檢測
router.get("/check-phone", async (req, res) => {
  const phone = String(req.query.phone || "").replace(/\D/g, "");
  if (phone.length < 6) return res.status(400).json({ success: false, message: "Invalid phone number" });

  try {
    const searchTables = {
      fraud_database: ["phone", "phone_number", "telephone", "mobile", "number", "contact", "account", "content"],
      blacklist: ["phone", "phone_number", "telephone", "mobile", "number", "keyword", "reason"],
      line_database: ["phone", "phone_number", "telephone", "mobile", "number", "line_id", "account", "content"],
    };
    const matches = [];

    for (const [tableName, possibleColumns] of Object.entries(searchTables)) {
      const [columns] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [tableName]);
      const existingColumns = columns.map((item) => item.COLUMN_NAME);
      const searchableColumns = possibleColumns.filter((column) => existingColumns.includes(column));

      if (searchableColumns.length === 0) continue;

      const whereSql = searchableColumns.map(column => `REPLACE(REPLACE(REPLACE(REPLACE(CAST(\`${column}\` AS CHAR), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?`).join(" OR ");
      const params = searchableColumns.map(() => `%${phone}%`);

      const [rows] = await pool.query(`SELECT *, ? AS source_table FROM \`${tableName}\` WHERE ${whereSql} LIMIT 10`, [tableName, ...params]);
      matches.push(...rows);
    }

    const isScam = matches.length > 0;
    const resPayload = {
      success: true, phone, isScam, carrier: "未知電信", score: isScam ? 88 : 15,
      message: isScam ? "注意！此號碼有疑似詐騙紀錄。" : "安全！目前資料庫中無此號碼紀錄。",
      data: matches,
    };
    resPayload.detail = { isScam, score: resPayload.score, carrier: resPayload.carrier, message: resPayload.message };
    res.json(resPayload);
  } catch (error) {
    console.error("Failed to check phone:", error);
    res.status(500).json({ success: false, message: "Failed to check phone", error: error.message });
  }
});

// 2. LINE ID 檢測
router.get("/check-line", async (req, res) => {
  const lineId = String(req.query.lineId || req.query.line || req.query.id || req.query.account || "").trim();
  if (lineId.length < 3) return res.status(400).json({ success: false, message: "Invalid LINE ID" });

  try {
    const searchTables = {
      line_database: ["line_id", "lineId", "line_account", "account", "id", "keyword", "content", "name"],
      blacklist: ["line_id", "lineId", "line_account", "account", "keyword", "reason"],
      fraud_database: ["line_id", "lineId", "line_account", "account", "content", "keyword"],
    };
    const matches = [];

    for (const [tableName, possibleColumns] of Object.entries(searchTables)) {
      const [columns] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [tableName]);
      const existingColumns = columns.map((item) => item.COLUMN_NAME);
      const searchableColumns = possibleColumns.filter((column) => existingColumns.includes(column));

      if (searchableColumns.length === 0) continue;

      const whereSql = searchableColumns.map(column => `CAST(\`${column}\` AS CHAR) LIKE ?`).join(" OR ");
      const params = searchableColumns.map(() => `%${lineId}%`);

      const [rows] = await pool.query(`SELECT *, ? AS source_table FROM \`${tableName}\` WHERE ${whereSql} LIMIT 10`, [tableName, ...params]);
      matches.push(...rows);
    }

    const isScam = matches.length > 0;
    const resPayload = {
      success: true, lineId, isScam, level: isScam ? "high" : "low", score: isScam ? 88 : 15, status: isScam ? "危險帳號" : "safe",
      message: isScam ? "注意！此 LINE ID 有疑似詐騙紀錄。" : "安全！目前資料庫中無此 LINE ID 紀錄。",
      reason: isScam ? "資料庫中找到相關紀錄。" : "", data: matches,
    };
    resPayload.detail = { ...resPayload };
    res.json(resPayload);
  } catch (error) {
    console.error("Failed to check LINE ID:", error);
    res.status(500).json({ success: false, message: "Failed to check LINE ID", error: error.message });
  }
});

// 3. 簡訊分析 (GET & POST 路由包攬)
router.get("/analyze-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.query.text || req.query.message);
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json(result);
  } catch (error) {
    console.error("Failed to analyze message:", error);
    res.status(500).json({ success: false, message: "Failed to analyze message", error: error.message });
  }
});

router.post("/analyze-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.body.text || req.body.message);
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json(result);
  } catch (error) {
    console.error("Failed to analyze message:", error);
    res.status(500).json({ success: false, message: "Failed to analyze message", error: error.message });
  }
});

router.get("/check-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.query.text || req.query.message);
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json(result);
  } catch (error) {
    console.error("Failed to check message:", error);
    res.status(500).json({ success: false, message: "Failed to check message", error: error.message });
  }
});

router.post("/check-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.body.text || req.body.message);
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json(result);
  } catch (error) {
    console.error("Failed to check message:", error);
    res.status(500).json({ success: false, message: "Failed to check message", error: error.message });
  }
});

module.exports = router;