const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test_db",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.get("/", (req, res) => {
  res.send("AI Shield Server Running!");
});

app.get("/api/anti-fraud-knowledge", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT knowledge_id, user_id, title, content, category, source, view_count, status, created_at, updated_at
       FROM anti_fraud_knowledge
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Failed to query anti_fraud_knowledge:", error);

    res.status(500).json({
      success: false,
      message: "Failed to query anti-fraud knowledge",
      error: error.message,
    });
  }
});

app.get("/api/blacklist", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM blacklist");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query blacklist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query blacklist",
      error: error.message,
    });
  }
});

app.get("/api/fraud-database", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM fraud_database");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query fraud_database:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query fraud database",
      error: error.message,
    });
  }
});

app.get("/api/line-database", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM line_database");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query line_database:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query line database",
      error: error.message,
    });
  }
});

app.get("/api/message-keywords", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM message_keywords");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query message_keywords:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query message keywords",
      error: error.message,
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM user");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to query users",
      error: error.message,
    });
  }
});

app.get("/api/check-phone", async (req, res) => {
  const phone = String(req.query.phone || "").replace(/\D/g, "");

  if (phone.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone number",
    });
  }

  try {
    const searchTables = {
      fraud_database: [
        "phone",
        "phone_number",
        "telephone",
        "mobile",
        "number",
        "contact",
        "account",
        "content",
      ],
      blacklist: [
        "phone",
        "phone_number",
        "telephone",
        "mobile",
        "number",
        "keyword",
        "reason",
      ],
      line_database: [
        "phone",
        "phone_number",
        "telephone",
        "mobile",
        "number",
        "line_id",
        "account",
        "content",
      ],
    };

    const matches = [];

    for (const [tableName, possibleColumns] of Object.entries(searchTables)) {
      const [columns] = await pool.query(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        `,
        [tableName]
      );

      const existingColumns = columns.map((item) => item.COLUMN_NAME);
      const searchableColumns = possibleColumns.filter((column) =>
        existingColumns.includes(column)
      );

      if (searchableColumns.length === 0) {
        continue;
      }

      const whereSql = searchableColumns
        .map(
          (column) =>
            `REPLACE(REPLACE(REPLACE(REPLACE(CAST(\`${column}\` AS CHAR), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?`
        )
        .join(" OR ");

      const params = searchableColumns.map(() => `%${phone}%`);

      const [rows] = await pool.query(
        `
        SELECT *, ? AS source_table
        FROM \`${tableName}\`
        WHERE ${whereSql}
        LIMIT 10
        `,
        [tableName, ...params]
      );

      matches.push(...rows);
    }

    const isScam = matches.length > 0;

    res.json({
      success: true,
      phone,
      isScam,
      carrier: "未知電信",
      score: isScam ? 88 : 15,
      message: isScam
        ? "注意！此號碼有疑似詐騙紀錄。"
        : "安全！目前資料庫中無此號碼紀錄。",
      data: matches,
      detail: {
        isScam,
        score: isScam ? 88 : 15,
        carrier: "未知電信",
        message: isScam
          ? "注意！此號碼有疑似詐騙紀錄。"
          : "安全！目前資料庫中無此號碼紀錄。",
      },
    });
  } catch (error) {
    console.error("Failed to check phone:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check phone",
      error: error.message,
    });
  }
});

app.get("/api/check-line", async (req, res) => {
  const lineId = String(
    req.query.lineId || req.query.line || req.query.id || req.query.account || ""
  ).trim();

  if (lineId.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Invalid LINE ID",
    });
  }

  try {
    const searchTables = {
      line_database: ["line_id", "lineId", "line_account", "account", "id", "keyword", "content", "name"],
      blacklist: ["line_id", "lineId", "line_account", "account", "keyword", "reason"],
      fraud_database: ["line_id", "lineId", "line_account", "account", "content", "keyword"],
    };

    const matches = [];

    for (const [tableName, possibleColumns] of Object.entries(searchTables)) {
      const [columns] = await pool.query(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        `,
        [tableName]
      );

      const existingColumns = columns.map((item) => item.COLUMN_NAME);
      const searchableColumns = possibleColumns.filter((column) =>
        existingColumns.includes(column)
      );

      if (searchableColumns.length === 0) continue;

      const whereSql = searchableColumns
        .map((column) => `CAST(\`${column}\` AS CHAR) LIKE ?`)
        .join(" OR ");

      const params = searchableColumns.map(() => `%${lineId}%`);

      const [rows] = await pool.query(
        `
        SELECT *, ? AS source_table
        FROM \`${tableName}\`
        WHERE ${whereSql}
        LIMIT 10
        `,
        [tableName, ...params]
      );

      matches.push(...rows);
    }

    const isScam = matches.length > 0;

    res.json({
      success: true,
      lineId,
      isScam,
      level: isScam ? "high" : "low",
      score: isScam ? 88 : 15,
      status: isScam ? "危險帳號" : "safe",
      message: isScam
        ? "注意！此 LINE ID 有疑似詐騙紀錄。"
        : "安全！目前資料庫中無此 LINE ID 紀錄。",
      reason: isScam ? "資料庫中找到相關紀錄。" : "",
      data: matches,
      detail: {
        lineId,
        isScam,
        level: isScam ? "high" : "low",
        score: isScam ? 88 : 15,
        status: isScam ? "危險帳號" : "safe",
        message: isScam
          ? "注意！此 LINE ID 有疑似詐騙紀錄。"
          : "安全！目前資料庫中無此 LINE ID 紀錄。",
        reason: isScam ? "資料庫中找到相關紀錄。" : "",
      },
    });
  } catch (error) {
    console.error("Failed to check LINE ID:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check LINE ID",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Shield Server Running: http://localhost:${PORT}`);
});