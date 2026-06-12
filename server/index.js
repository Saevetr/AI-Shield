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

async function analyzeMessageText(text) {
  const messageText = String(text || "").trim();

  if (messageText.length < 2) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid message text",
    };
  }

  const [keywords] = await pool.query(
    "SELECT id, keyword, level, score, reason FROM message_keywords"
  );

  const matchedKeywords = keywords.filter((item) => {
    const keyword = String(item.keyword || "").trim();
    return keyword && messageText.includes(keyword);
  });

  let level = "low";
  let score = 15;

  if (matchedKeywords.length > 0) {
    const maxScore = Math.max(
      ...matchedKeywords.map((item) => Number(item.score || 0))
    );

    score = maxScore || 80;

    if (score >= 80) {
      level = "high";
    } else if (score >= 50) {
      level = "medium";
    } else {
      level = "low";
    }
  }

  const isScam = matchedKeywords.length > 0 && score >= 50;

  return {
    success: true,
    text: messageText,
    isScam,
    level,
    score,
    message: isScam
      ? "此訊息包含疑似詐騙關鍵字，請提高警覺。"
      : "目前未發現明顯詐騙關鍵字。",
    matchedKeywords,
    data: {
      isScam,
      level,
      score,
      message: isScam
        ? "此訊息包含疑似詐騙關鍵字，請提高警覺。"
        : "目前未發現明顯詐騙關鍵字。",
      matchedKeywords,
    },
    detail: {
      isScam,
      level,
      score,
      message: isScam
        ? "此訊息包含疑似詐騙關鍵字，請提高警覺。"
        : "目前未發現明顯詐騙關鍵字。",
      reason:
        matchedKeywords.length > 0
          ? matchedKeywords.map((item) => item.reason || item.keyword).join("、")
          : "",
    },
  };
}

app.get("/api/analyze-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.query.text || req.query.message);

    if (result.success === false) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Failed to analyze message:", error);

    res.status(500).json({
      success: false,
      message: "Failed to analyze message",
      error: error.message,
    });
  }
});

app.post("/api/analyze-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.body.text || req.body.message);

    if (result.success === false) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Failed to analyze message:", error);

    res.status(500).json({
      success: false,
      message: "Failed to analyze message",
      error: error.message,
    });
  }
});

app.get("/api/check-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.query.text || req.query.message);

    if (result.success === false) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Failed to check message:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check message",
      error: error.message,
    });
  }
});

app.post("/api/check-message", async (req, res) => {
  try {
    const result = await analyzeMessageText(req.body.text || req.body.message);

    if (result.success === false) {
      return res.status(result.statusCode || 400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Failed to check message:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check message",
      error: error.message,
    });
  }
});

app.get("/api/home/top-fraud-types", async (req, res) => {
  try {
    const defaultTopTypes = [
      {
        rank: 1,
        name: "網路購物詐騙",
        count: 128,
        icon: "cart",
      },
      {
        rank: 2,
        name: "假投資詐騙",
        count: 34,
        icon: "trending-up",
      },
      {
        rank: 3,
        name: "假交友(投資詐財)詐騙",
        count: 24,
        icon: "heart",
      },
    ];

    // 先檢查 fraud_database 有沒有可用欄位
    const [columns] = await pool.query(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'fraud_database'
      `
    );

    const existingColumns = columns.map((item) => item.COLUMN_NAME);

    const possibleTypeColumns = [
      "fraud_type",
      "type",
      "category",
      "fraud_category",
      "case_type",
      "scam_type",
    ];

    const typeColumn = possibleTypeColumns.find((column) =>
      existingColumns.includes(column)
    );

    // 如果 fraud_database 沒有分類欄位，就先回傳預設 TOP 3
    if (!typeColumn) {
      return res.json({
        success: true,
        source: "default",
        data: defaultTopTypes,
      });
    }

    const [rows] = await pool.query(
      `
      SELECT \`${typeColumn}\` AS name, COUNT(*) AS count
      FROM fraud_database
      WHERE \`${typeColumn}\` IS NOT NULL
        AND \`${typeColumn}\` != ''
      GROUP BY \`${typeColumn}\`
      ORDER BY count DESC
      LIMIT 3
      `
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        source: "default",
        data: defaultTopTypes,
      });
    }

    const iconMap = ["cart", "trending-up", "heart"];

    const data = rows.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      count: Number(item.count),
      icon: iconMap[index] || "alert-circle",
    }));

    res.json({
      success: true,
      source: "database",
      data,
    });
  } catch (error) {
    console.error("Failed to get top fraud types:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get top fraud types",
      error: error.message,
    });
  }
});

app.get("/api/home/summary", async (req, res) => {
  try {
    const getTableCount = async (tableName) => {
      const [tables] = await pool.query(
        `
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        `,
        [tableName]
      );

      if (tables.length === 0) {
        return 0;
      }

      const [rows] = await pool.query(
        `SELECT COUNT(*) AS count FROM \`${tableName}\``
      );

      return Number(rows[0].count || 0);
    };

    const blacklistCount = await getTableCount("blacklist");
    const fraudDatabaseCount = await getTableCount("fraud_database");
    const reportCount = await getTableCount("report");
    const reportFraudCount = await getTableCount("report_fraud");
    const knowledgeCount = await getTableCount("anti_fraud_knowledge");
    const keywordCount = await getTableCount("message_keywords");
    const userCount = await getTableCount("user");

    const totalReportCount = reportCount + reportFraudCount;
    const highRiskCount = blacklistCount + fraudDatabaseCount;

    res.json({
      success: true,
      data: {
        reportCount: totalReportCount,
        highRiskCount,
        blacklistCount,
        fraudDatabaseCount,
        knowledgeCount,
        keywordCount,
        userCount,
      },
    });
  } catch (error) {
    console.error("Failed to get home summary:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get home summary",
      error: error.message,
    });
  }
});

app.get("/api/home/recent-risk-phones", async (req, res) => {
  try {
    const possibleTables = ["blacklist", "fraud_database"];
    const possiblePhoneColumns = [
      "phone",
      "phone_number",
      "telephone",
      "mobile",
      "number",
      "contact",
      "account",
    ];
    const possibleReasonColumns = [
      "reason",
      "description",
      "content",
      "type",
      "category",
      "fraud_type",
      "note",
    ];
    const possibleDateColumns = [
      "created_at",
      "updated_at",
      "report_time",
      "reported_at",
      "date",
    ];

    const results = [];

    for (const tableName of possibleTables) {
      const [columns] = await pool.query(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        `,
        [tableName]
      );

      if (columns.length === 0) {
        continue;
      }

      const existingColumns = columns.map((item) => item.COLUMN_NAME);

      const phoneColumn = possiblePhoneColumns.find((column) =>
        existingColumns.includes(column)
      );

      if (!phoneColumn) {
        continue;
      }

      const reasonColumn = possibleReasonColumns.find((column) =>
        existingColumns.includes(column)
      );

      const dateColumn = possibleDateColumns.find((column) =>
        existingColumns.includes(column)
      );

      const reasonSelect = reasonColumn
        ? `\`${reasonColumn}\` AS reason`
        : `'疑似高風險號碼' AS reason`;

      const dateSelect = dateColumn
        ? `\`${dateColumn}\` AS created_at`
        : `NULL AS created_at`;

      const orderSql = dateColumn
        ? `ORDER BY \`${dateColumn}\` DESC`
        : "";

      const [rows] = await pool.query(
        `
        SELECT
          \`${phoneColumn}\` AS phone,
          ${reasonSelect},
          ${dateSelect},
          ? AS source_table
        FROM \`${tableName}\`
        WHERE \`${phoneColumn}\` IS NOT NULL
          AND \`${phoneColumn}\` != ''
        ${orderSql}
        LIMIT 5
        `,
        [tableName]
      );

      results.push(...rows);
    }

    const data = results.slice(0, 5).map((item, index) => ({
      id: index + 1,
      phone: item.phone,
      reason: item.reason || "疑似高風險號碼",
      source: item.source_table,
      createdAt: item.created_at,
      level: "high",
    }));

    res.json({
      success: true,
      data,
      message:
        data.length > 0
          ? "Recent high-risk phones loaded"
          : "No recent high-risk phones",
    });
  } catch (error) {
    console.error("Failed to get recent risk phones:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get recent risk phones",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI Shield Server Running: http://localhost:${PORT}`);
});