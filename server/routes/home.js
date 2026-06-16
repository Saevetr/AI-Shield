// routes/home.js
const express = require("express");
const router = express.Router();
const pool = require("./db");

// 各大資料表原始 Query
router.get("/anti-fraud-knowledge", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT knowledge_id, user_id, title, content, category, source, view_count, status, created_at, updated_at FROM anti_fraud_knowledge ORDER BY created_at DESC");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to query anti-fraud knowledge", error: error.message });
  }
});

router.get("/blacklist", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM blacklist");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to query blacklist", error: error.message });
  }
});

router.get("/fraud-database", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM fraud_database");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to query fraud database", error: error.message });
  }
});

router.get("/line-database", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM line_database");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to query line database", error: error.message });
  }
});

router.get("/message-keywords", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM message_keywords");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to query message keywords", error: error.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM user");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to query users", error: error.message });
  }
});

// 首頁數據 1：熱門詐騙類型
router.get("/home/top-fraud-types", async (req, res) => {
  try {
    const defaultTopTypes = [
      { rank: 1, name: "網路購物詐騙", count: 128, icon: "cart" },
      { rank: 2, name: "假投資詐騙", count: 34, icon: "trending-up" },
      { rank: 3, name: "假交友(投資詐財)詐騙", count: 24, icon: "heart" },
    ];

    const [columns] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fraud_database'");
    const existingColumns = columns.map((item) => item.COLUMN_NAME);
    const possibleTypeColumns = ["fraud_type", "type", "category", "fraud_category", "case_type", "scam_type"];
    const typeColumn = possibleTypeColumns.find((column) => existingColumns.includes(column));

    if (!typeColumn) return res.json({ success: true, source: "default", data: defaultTopTypes });

    const [rows] = await pool.query(`SELECT \`${typeColumn}\` AS name, COUNT(*) AS count FROM fraud_database WHERE \`${typeColumn}\` IS NOT NULL AND \`${typeColumn}\` != '' GROUP BY \`${typeColumn}\` ORDER BY count DESC LIMIT 3`);
    if (rows.length === 0) return res.json({ success: true, source: "default", data: defaultTopTypes });

    const iconMap = ["cart", "trending-up", "heart"];
    const data = rows.map((item, index) => ({ rank: index + 1, name: item.name, count: Number(item.count), icon: iconMap[index] || "alert-circle" }));
    res.json({ success: true, source: "database", data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get top fraud types", error: error.message });
  }
});

// 首頁數據 2：儀表板數據統計
router.get("/home/summary", async (req, res) => {
  try {
    const getTableCount = async (tableName) => {
      const [tables] = await pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [tableName]);
      if (tables.length === 0) return 0;
      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
      return Number(rows[0].count || 0);
    };

    const blacklistCount = await getTableCount("blacklist");
    const fraudDatabaseCount = await getTableCount("fraud_database");
    const reportCount = await getTableCount("report");
    const reportFraudCount = await getTableCount("report_fraud");
    const knowledgeCount = await getTableCount("anti_fraud_knowledge");
    const keywordCount = await getTableCount("message_keywords");
    const userCount = await getTableCount("user");

    res.json({
      success: true,
      data: { reportCount: reportCount + reportFraudCount, highRiskCount: blacklistCount + fraudDatabaseCount, blacklistCount, fraudDatabaseCount, knowledgeCount, keywordCount, userCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get home summary", error: error.message });
  }
});

// 首頁數據 3：最新高風險號碼
router.get("/home/recent-risk-phones", async (req, res) => {
  try {
    const possibleTables = ["blacklist", "fraud_database"];
    const possiblePhoneColumns = ["phone", "phone_number", "telephone", "mobile", "number", "contact", "account"];
    const possibleReasonColumns = ["reason", "description", "content", "type", "category", "fraud_type", "note"];
    const possibleDateColumns = ["created_at", "updated_at", "report_time", "reported_at", "date"];
    const results = [];

    for (const tableName of possibleTables) {
      const [columns] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [tableName]);
      if (columns.length === 0) continue;

      const existingColumns = columns.map((item) => item.COLUMN_NAME);
      const phoneColumn = possiblePhoneColumns.find((column) => existingColumns.includes(column));
      if (!phoneColumn) continue;

      const reasonColumn = possibleReasonColumns.find((column) => existingColumns.includes(column));
      const dateColumn = possibleDateColumns.find((column) => existingColumns.includes(column));

      const reasonSelect = reasonColumn ? `\`${reasonColumn}\` AS reason` : `'疑似高風險號碼' AS reason`;
      const dateSelect = dateColumn ? `\`${dateColumn}\` AS created_at` : `NULL AS created_at`;
      const orderSql = dateColumn ? `ORDER BY \`${dateColumn}\` DESC` : "";

      const [rows] = await pool.query(`SELECT \`${phoneColumn}\` AS phone, ${reasonSelect}, ${dateSelect}, ? AS source_table FROM \`${tableName}\` WHERE \`${phoneColumn}\` IS NOT NULL AND \`${phoneColumn}\` != '' ${orderSql} LIMIT 5`, [tableName]);
      results.push(...rows);
    }

    const data = results.slice(0, 5).map((item, index) => ({ id: index + 1, phone: item.phone, reason: item.reason || "疑似高風險號碼", source: item.source_table, createdAt: item.created_at, level: "high" }));
    res.json({ success: true, data, message: data.length > 0 ? "Recent high-risk phones loaded" : "No recent high-risk phones" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get recent risk phones", error: error.message });
  }
});

// 首頁數據 4：最新防詐知識
router.get("/home/latest-knowledge", async (req, res) => {
  try {
    const defaultKnowledge = [
      { id: 1, title: "假投資詐騙提醒", content: "看到保證獲利、穩賺不賠、高報酬低風險等話術，請提高警覺。", category: "技巧", source: "165 全民防騙網", viewCount: 0 },
      { id: 2, title: "網路購物詐騙提醒", content: "購物前請確認賣場評價，不要私下匯款或點擊不明付款連結。", category: "手法", source: "警政署", viewCount: 0 },
      { id: 3, title: "LINE 陌生帳號提醒", content: "陌生帳號要求加入投資群、購買點數或提供驗證碼時，請先查證。", category: "技巧", source: "AI Shield", viewCount: 0 },
    ];

    const [tables] = await pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anti_fraud_knowledge'");
    if (tables.length === 0) return res.json({ success: true, source: "default", data: defaultKnowledge });

    const [rows] = await pool.query("SELECT knowledge_id AS id, title, content, category, source, view_count AS viewCount, created_at AS createdAt FROM anti_fraud_knowledge ORDER BY created_at DESC LIMIT 3");
    if (rows.length === 0) return res.json({ success: true, source: "default", data: defaultKnowledge });

    res.json({ success: true, source: "database", data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get latest knowledge", error: error.message });
  }
});

module.exports = router;