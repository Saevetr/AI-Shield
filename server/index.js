const express = require("express");
const cors = require("cors");
const sql = require("mssql");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: String(process.env.DB_ENCRYPT || "true").toLowerCase() === "true",
    trustServerCertificate:
      String(process.env.DB_TRUST_SERVER_CERTIFICATE || "false").toLowerCase() === "true",
  },
};

let sqlPoolPromise;

function getSqlPool() {
  if (!sqlPoolPromise) {
    sqlPoolPromise = sql.connect(dbConfig);
  }

  return sqlPoolPromise;
}

function convertLimitToTop(queryText) {
  const limitMatch = queryText.match(/\s+LIMIT\s+(\d+)\s*;?\s*$/i);

  if (!limitMatch) return queryText;

  const limitNumber = limitMatch[1];
  const queryWithoutLimit = queryText.replace(/\s+LIMIT\s+\d+\s*;?\s*$/i, "");

  return queryWithoutLimit.replace(/^\s*SELECT\s+/i, (selectKeyword) => {
    return `${selectKeyword}TOP (${limitNumber}) `;
  });
}

function convertMysqlToSqlServer(queryText) {
  let convertedQuery = String(queryText || "")
    .replace(/WHERE\s+TABLE_SCHEMA\s*=\s*DATABASE\(\)/gi, "WHERE TABLE_CATALOG = DB_NAME()")
    .replace(/AND\s+TABLE_SCHEMA\s*=\s*DATABASE\(\)/gi, "AND TABLE_CATALOG = DB_NAME()")
    .replace(/`([^`]+)`/g, "[$1]")
    .replace(/\bCAST\(([^)]*)\s+AS\s+CHAR\)/gi, "CAST($1 AS NVARCHAR(MAX))")
    .replace(/\bFROM\s+user\b/gi, "FROM [user]")
    .replace(/\bUPDATE\s+user\b/gi, "UPDATE [user]")
    .replace(/\bINSERT\s+INTO\s+user\b/gi, "INSERT INTO [user]")
    .replace(/\bNOW\(\)/gi, "GETDATE()");

  convertedQuery = convertLimitToTop(convertedQuery);

  let paramIndex = 0;
  convertedQuery = convertedQuery.replace(/\?/g, () => `@p${paramIndex++}`);

  return convertedQuery;
}

const pool = {
  async query(queryText, params = []) {
    const sqlPool = await getSqlPool();
    const request = sqlPool.request();

    params.forEach((value, index) => {
      request.input(`p${index}`, value === undefined ? null : value);
    });

    const convertedQuery = convertMysqlToSqlServer(queryText);

    try {
      const result = await request.query(convertedQuery);
      const isSelect = /^\s*SELECT/i.test(convertedQuery);

      if (isSelect) {
        return [result.recordset || [], result];
      }

      return [
        {
          affectedRows: result.rowsAffected?.[0] || 0,
          rowsAffected: result.rowsAffected,
          insertId: result.recordset?.[0]?.insertId,
        },
        result,
      ];
    } catch (error) {
      console.error("SQL Server query failed");
      console.error("Original query:", queryText);
      console.error("Converted query:", convertedQuery);
      throw error;
    }
  },

  async execute(queryText, params = []) {
    return this.query(queryText, params);
  },
};

async function getTableColumns(tableName) {
  const [columns] = await pool.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return columns.map((item) => item.COLUMN_NAME);
}

async function tableExists(tableName) {
  const [tables] = await pool.query(
    `
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return tables.length > 0;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

async function searchTablesByValue(searchTables, searchValue, options = {}) {
  const matches = [];
  const value = String(searchValue || "").trim();

  for (const [tableName, possibleColumns] of Object.entries(searchTables)) {
    const existingColumns = await getTableColumns(tableName);
    const searchableColumns = possibleColumns.filter((column) =>
      existingColumns.includes(column)
    );

    if (searchableColumns.length === 0) continue;

    const whereSql = searchableColumns
      .map((column) => {
        if (options.normalizePhone) {
          return `REPLACE(REPLACE(REPLACE(REPLACE(CAST(\`${column}\` AS CHAR), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?`;
        }

        return `CAST(\`${column}\` AS CHAR) LIKE ?`;
      })
      .join(" OR ");

    const params = searchableColumns.map(() => `%${value}%`);

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

  return matches;
}

async function loadKeywordRows() {
  try {
    const [rows] = await pool.query(
      "SELECT id, keyword, level, score, reason FROM message_keywords"
    );

    return {
      tableName: "message_keywords",
      rows,
    };
  } catch (messageKeywordError) {
    console.log(
      "message_keywords 不存在或無法查詢，嘗試 fraud_keywords:",
      messageKeywordError.message
    );
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, keyword, level, score, reason FROM fraud_keywords"
    );

    return {
      tableName: "fraud_keywords",
      rows,
    };
  } catch (fraudKeywordError) {
    console.log(
      "fraud_keywords 不存在或無法查詢，改用內建關鍵字:",
      fraudKeywordError.message
    );
  }

  const fallbackKeywords = [
    {
      id: 1,
      keyword: "投資",
      level: "high",
      score: 88,
      reason: "常見投資詐騙關鍵字",
    },
    {
      id: 2,
      keyword: "獲利",
      level: "high",
      score: 88,
      reason: "常見高報酬詐騙話術",
    },
    {
      id: 3,
      keyword: "穩賺",
      level: "high",
      score: 90,
      reason: "保證獲利通常為高風險話術",
    },
    {
      id: 4,
      keyword: "保證",
      level: "medium",
      score: 65,
      reason: "疑似保證收益話術",
    },
    {
      id: 5,
      keyword: "貸款",
      level: "medium",
      score: 60,
      reason: "常見貸款詐騙關鍵字",
    },
    {
      id: 6,
      keyword: "中獎",
      level: "high",
      score: 85,
      reason: "常見中獎詐騙關鍵字",
    },
    {
      id: 7,
      keyword: "匯款",
      level: "medium",
      score: 65,
      reason: "涉及金流，需提高警覺",
    },
    {
      id: 8,
      keyword: "點擊連結",
      level: "high",
      score: 85,
      reason: "疑似釣魚連結話術",
    },
    {
      id: 9,
      keyword: "驗證碼",
      level: "high",
      score: 85,
      reason: "要求驗證碼通常為高風險行為",
    },
    {
      id: 10,
      keyword: "加入群組",
      level: "medium",
      score: 60,
      reason: "常見投資群組引流話術",
    },
  ];

  return {
    tableName: "built_in_fallback",
    rows: fallbackKeywords,
  };
}

async function checkPhoneValue(rawPhone) {
  const phone = normalizePhone(rawPhone);

  if (phone.length < 6) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid phone number",
    };
  }

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
      "fraud_value",
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

  const matches = await searchTablesByValue(searchTables, phone, {
    normalizePhone: true,
  });

  const isScam = matches.length > 0;
  const score = isScam ? 88 : 15;
  const level = isScam ? "high" : "low";
  const carrier = "未知電信";
  const message = isScam
    ? "注意！此號碼有疑似詐騙紀錄。"
    : "安全！目前資料庫中無此號碼紀錄。";

  return {
    success: true,
    phone,
    isScam,
    isFraud: isScam,
    exists: isScam,
    status: isScam ? "scam" : "safe",
    level,
    score,
    carrier,
    message,
    matches,
    data: {
      isScam,
      level,
      score,
      carrier,
      message,
      matches,
    },
    detail: {
      isScam,
      level,
      score,
      carrier,
      message,
    },
  };
}

async function handlePhoneCheck(req, res) {
  try {
    const phoneInput = req.body?.phone || req.query?.phone;
    const result = await checkPhoneValue(phoneInput);

    if (result.success === false) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Failed to check phone:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check phone",
      error: error.message,
    });
  }
}

async function analyzeMessageText(text) {
  const messageText = String(text || "").trim();

  if (messageText.length < 2) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid message text",
    };
  }

  const { tableName, rows: keywords } = await loadKeywordRows();

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

    if (score >= 80) level = "high";
    else if (score >= 50) level = "medium";
    else level = "low";
  }

  const isScam = matchedKeywords.length > 0;
  const message = isScam
    ? "此訊息包含疑似詐騙關鍵字，請提高警覺。"
    : "目前未發現明顯詐騙關鍵字。";

  return {
    success: true,
    sourceTable: tableName,
    text: messageText,
    isScam,
    level,
    score,
    message,
    matchedKeywords,
    data: {
      isScam,
      level,
      score,
      message,
      matchedKeywords,
    },
    detail: {
      isScam,
      level,
      score,
      message,
      reason:
        matchedKeywords.length > 0
          ? matchedKeywords.map((item) => item.reason || item.keyword).join("、")
          : "",
    },
  };
}

async function handleMessageCheck(req, res) {
  try {
    const messageInput =
      req.body?.text || req.body?.message || req.query?.text || req.query?.message;

    const result = await analyzeMessageText(messageInput);

    if (result.success === false) {
      return res.status(result.statusCode || 400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Failed to analyze message:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze message",
      error: error.message,
    });
  }
}

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

    res.json({ success: true, data: rows });
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
    const { tableName, rows } = await loadKeywordRows();
    res.json({ success: true, sourceTable: tableName, data: rows });
  } catch (error) {
    console.error("Failed to query message keywords:", error);
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

app.get("/api/check-phone", handlePhoneCheck);
app.post("/api/check-phone", handlePhoneCheck);
app.post("/api/phone-check", handlePhoneCheck);
app.post("/api/phone-query", handlePhoneCheck);

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
      line_database: [
        "line_id",
        "lineId",
        "line_account",
        "account",
        "id",
        "keyword",
        "content",
        "name",
      ],
      blacklist: [
        "line_id",
        "lineId",
        "line_account",
        "account",
        "keyword",
        "reason",
      ],
      fraud_database: [
        "line_id",
        "lineId",
        "line_account",
        "account",
        "content",
        "keyword",
      ],
    };

    const matches = await searchTablesByValue(searchTables, lineId);
    const isScam = matches.length > 0;
    const level = isScam ? "high" : "low";
    const score = isScam ? 88 : 15;
    const status = isScam ? "危險帳號" : "safe";
    const message = isScam
      ? "注意！此 LINE ID 有疑似詐騙紀錄。"
      : "安全！目前資料庫中無此 LINE ID 紀錄。";
    const reason = isScam ? "資料庫中找到相關紀錄。" : "";

    res.json({
      success: true,
      lineId,
      isScam,
      level,
      score,
      status,
      message,
      reason,
      data: matches,
      detail: {
        lineId,
        isScam,
        level,
        score,
        status,
        message,
        reason,
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

app.get("/api/analyze-message", handleMessageCheck);
app.post("/api/analyze-message", handleMessageCheck);
app.get("/api/check-message", handleMessageCheck);
app.post("/api/check-message", handleMessageCheck);

app.get("/api/home/top-fraud-types", async (req, res) => {
  try {
    const defaultTopTypes = [
      { rank: 1, name: "網路購物詐騙", count: 128, icon: "cart" },
      { rank: 2, name: "假投資詐騙", count: 34, icon: "trending-up" },
      { rank: 3, name: "假交友(投資詐財)詐騙", count: 24, icon: "heart" },
    ];

    const existingColumns = await getTableColumns("fraud_database");
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

    if (!typeColumn) {
      return res.json({ success: true, source: "default", data: defaultTopTypes });
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
      return res.json({ success: true, source: "default", data: defaultTopTypes });
    }

    const iconMap = ["cart", "trending-up", "heart"];
    const data = rows.map((item, index) => ({
      rank: index + 1,
      name: item.name,
      count: Number(item.count),
      icon: iconMap[index] || "alert-circle",
    }));

    res.json({ success: true, source: "database", data });
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
      const exists = await tableExists(tableName);
      if (!exists) return 0;

      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
      return Number(rows[0]?.count || 0);
    };

    const blacklistCount = await getTableCount("blacklist");
    const fraudDatabaseCount = await getTableCount("fraud_database");
    const reportCount = await getTableCount("report");
    const reportFraudCount = await getTableCount("report_fraud");
    const knowledgeCount = await getTableCount("anti_fraud_knowledge");
    const keywordCount =
      (await getTableCount("message_keywords")) ||
      (await getTableCount("fraud_keywords"));
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
      "fraud_value",
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
      const exists = await tableExists(tableName);
      if (!exists) continue;

      const existingColumns = await getTableColumns(tableName);
      const phoneColumn = possiblePhoneColumns.find((column) =>
        existingColumns.includes(column)
      );

      if (!phoneColumn) continue;

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
      const orderSql = dateColumn ? `ORDER BY \`${dateColumn}\` DESC` : "";

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

app.get("/api/home/latest-knowledge", async (req, res) => {
  try {
    const defaultKnowledge = [
      {
        id: 1,
        title: "假投資詐騙提醒",
        content: "看到保證獲利、穩賺不賠、高報酬低風險等話術，請提高警覺。",
        category: "技巧",
        source: "165 全民防騙網",
        viewCount: 0,
      },
      {
        id: 2,
        title: "網路購物詐騙提醒",
        content: "購物前請確認賣場評價，不要私下匯款或點擊不明付款連結。",
        category: "手法",
        source: "警政署",
        viewCount: 0,
      },
      {
        id: 3,
        title: "LINE 陌生帳號提醒",
        content: "陌生帳號要求加入投資群、購買點數或提供驗證碼時，請先查證。",
        category: "技巧",
        source: "AI Shield",
        viewCount: 0,
      },
    ];

    const exists = await tableExists("anti_fraud_knowledge");

    if (!exists) {
      return res.json({ success: true, source: "default", data: defaultKnowledge });
    }

    const [rows] = await pool.query(
      `
      SELECT
        knowledge_id AS id,
        title,
        content,
        category,
        source,
        view_count AS viewCount,
        created_at AS createdAt
      FROM anti_fraud_knowledge
      ORDER BY created_at DESC
      LIMIT 3
      `
    );

    if (rows.length === 0) {
      return res.json({ success: true, source: "default", data: defaultKnowledge });
    }

    res.json({ success: true, source: "database", data: rows });
  } catch (error) {
    console.error("Failed to get latest knowledge:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get latest knowledge",
      error: error.message,
    });
  }
});

app.post("/api/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!account || !password) {
    return res.status(400).json({
      success: false,
      message: "Account and password are required",
    });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        user_id,
        username,
        email,
        membership_level,
        created_at,
        is_verified,
        status,
        last_login,
        customer_id
      FROM \`user\`
      WHERE (email = ? OR username = ?)
        AND password_hash = ?
        AND status = 'ACTIVE'
      LIMIT 1
      `,
      [account, account, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid account or password",
      });
    }

    const user = rows[0];

    await pool.query(
      "UPDATE `user` SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
      [user.user_id]
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        ...user,
        last_login: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to login:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
});

app.post("/api/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "").trim();

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Username, email and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT user_id FROM `user` WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists",
      });
    }

    const customerId = `CUST${Date.now()}`;

    const [result] = await pool.query(
      `
      INSERT INTO \`user\`
        (username, email, password_hash, membership_level, is_verified, status, customer_id)
      OUTPUT INSERTED.user_id AS insertId
      VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)
      `,
      [username, email, password, customerId]
    );

    res.status(201).json({
      success: true,
      message: "Register successful",
      data: {
        user_id: result.insertId,
        username,
        email,
        membership_level: "FREE",
        is_verified: 1,
        status: "ACTIVE",
        customer_id: customerId,
      },
    });
  } catch (error) {
    console.error("Failed to register:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register",
      error: error.message,
    });
  }
});

app.post("/api/google-login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const username = String(
    req.body.username ||
      req.body.displayName ||
      req.body.name ||
      email.split("@")[0] ||
      ""
  ).trim();
  const googleId = String(req.body.googleId || req.body.uid || "").trim();

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];

      await pool.query(
        "UPDATE user SET last_login = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE user_id = ?",
        [user.user_id]
      );

      return res.json({
        success: true,
        message: "Google login successful",
        data: {
          ...user,
          last_login: new Date(),
        },
      });
    }

    const customerId = "GOOGLE" + Date.now();

    const [result] = await pool.query(
      "INSERT INTO user (username, email, password_hash, membership_level, is_verified, status, customer_id) OUTPUT INSERTED.user_id AS insertId VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)",
      [username || email.split("@")[0], email, googleId || "GOOGLE_LOGIN", customerId]
    );

    res.status(201).json({
      success: true,
      message: "Google register and login successful",
      data: {
        user_id: result.insertId,
        username: username || email.split("@")[0],
        email,
        membership_level: "FREE",
        is_verified: 1,
        status: "ACTIVE",
        customer_id: customerId,
      },
    });
  } catch (error) {
    console.error("Failed to login with Google:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login with Google",
      error: error.message,
    });
  }
});

app.get("/api/line-login", (req, res) => {
  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = process.env.LINE_REDIRECT_URI;

  if (!channelId || !redirectUri) {
    return res.status(500).json({
      success: false,
      message: "LINE login settings are missing",
    });
  }

  const rawFrontendUrl = String(
    req.query.frontendUrl ||
      req.query.frontend ||
      req.query.returnTo ||
      process.env.FRONTEND_URL ||
      ""
  ).trim();

  const defaultFrontendUrl = process.env.FRONTEND_URL || "http://localhost:8082";

  const isSafeFrontendUrl =
    /^https?:\/\/localhost(:\d+)?$/i.test(rawFrontendUrl) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(rawFrontendUrl) ||
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/i.test(rawFrontendUrl);

  const frontendUrl = isSafeFrontendUrl ? rawFrontendUrl : defaultFrontendUrl;

  const statePayload = Buffer.from(
    JSON.stringify({
      nonce: Date.now() + "_" + Math.random().toString(36).slice(2),
      frontendUrl,
    })
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const state = "line_" + statePayload;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
  });

  res.redirect("https://access.line.me/oauth2/v2.1/authorize?" + params.toString());
});

app.get("/api/line-login/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const error = String(req.query.error || "");
  let frontendUrl = process.env.FRONTEND_URL || "http://localhost:8082";

  try {
    const state = String(req.query.state || "");

    if (state.startsWith("line_")) {
      const encodedState = state.slice(5).replace(/-/g, "+").replace(/_/g, "/");
      const stateJson = Buffer.from(encodedState, "base64").toString("utf8");
      const parsedState = JSON.parse(stateJson);

      const stateFrontendUrl = String(parsedState.frontendUrl || "").trim();

      const isSafeFrontendUrl =
        /^https?:\/\/localhost(:\d+)?$/i.test(stateFrontendUrl) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(stateFrontendUrl) ||
        /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/i.test(stateFrontendUrl);

      if (isSafeFrontendUrl) {
        frontendUrl = stateFrontendUrl;
      }
    }
  } catch (stateError) {
    console.log("Failed to parse LINE state:", stateError.message);
  }

  const redirectToFrontend = (status, message) => {
    const target = new URL("/line-callback", frontendUrl);
    target.searchParams.set("status", status);

    if (message) {
      target.searchParams.set("message", message);
    }

    return target.toString();
  };

  if (error) {
    return res.redirect(redirectToFrontend("failed", error));
  }

  if (!code) {
    return res.redirect(redirectToFrontend("failed", "Missing LINE code"));
  }

  try {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.LINE_REDIRECT_URI || "",
      client_id: process.env.LINE_CHANNEL_ID || "",
      client_secret: process.env.LINE_CHANNEL_SECRET || "",
    });

    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        tokenData.error_description ||
          tokenData.error ||
          "Failed to get LINE token"
      );
    }

    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: {
        Authorization: "Bearer " + tokenData.access_token,
      },
    });

    const profile = await profileResponse.json();

    if (!profileResponse.ok) {
      throw new Error("Failed to get LINE profile");
    }

    const lineUserId = String(profile.userId || "");
    const displayName = String(profile.displayName || "LINE User").trim();

    if (!lineUserId) {
      throw new Error("Missing LINE user id");
    }

    const lineEmail = "line_" + lineUserId + "@line.local";
    const username = (displayName || "LINE User") + "_" + lineUserId.slice(-6);
    const customerId = "LINE" + Date.now();

    const [existingUsers] = await pool.query(
      "SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM user WHERE email = ? LIMIT 1",
      [lineEmail]
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];

      await pool.query(
        "UPDATE user SET last_login = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE user_id = ?",
        [user.user_id]
      );

      return res.redirect(redirectToFrontend("success", "LINE login successful"));
    }

    await pool.query(
      "INSERT INTO user (username, email, password_hash, membership_level, is_verified, status, customer_id) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)",
      [username, lineEmail, lineUserId, customerId]
    );

    res.redirect(redirectToFrontend("success", "LINE register and login successful"));
  } catch (error) {
    console.error("Failed to login with LINE:", error);

    res.redirect(
      redirectToFrontend(
        "failed",
        error instanceof Error ? error.message : "LINE login failed"
      )
    );
  }
});


async function insertIntoExistingColumns(tableName, valueMap) {
  const exists = await tableExists(tableName);

  if (!exists) {
    return {
      success: false,
      message: `${tableName} table does not exist`,
    };
  }

  const existingColumns = await getTableColumns(tableName);

  const entries = Object.entries(valueMap).filter(([column, value]) => {
    return existingColumns.includes(column) && value !== undefined && value !== null;
  });

  if (entries.length === 0) {
    return {
      success: false,
      message: `No matching columns found for ${tableName}`,
      existingColumns,
    };
  }

  const columnsSql = entries.map(([column]) => `\`${column}\``).join(", ");
  const placeholdersSql = entries.map(() => "?").join(", ");
  const params = entries.map(([, value]) => value);

  const [result] = await pool.query(
    `
    INSERT INTO \`${tableName}\`
      (${columnsSql})
    VALUES
      (${placeholdersSql})
    `,
    params
  );

  return {
    success: true,
    tableName,
    affectedRows: result.affectedRows || 0,
    insertedColumns: entries.map(([column]) => column),
  };
}

app.post("/api/blacklist", async (req, res) => {
  const lineId = String(
    req.body.lineId ||
      req.body.line_id ||
      req.body.account ||
      req.body.value ||
      ""
  ).trim();

  const reason = String(
    req.body.reason ||
      req.body.description ||
      "使用者手動加入黑名單"
  ).trim();

  if (lineId.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Invalid LINE ID",
    });
  }

  try {
    const now = new Date();

    const result = await insertIntoExistingColumns("blacklist", {
      line_id: lineId,
      lineId: lineId,
      line_account: lineId,
      account: lineId,
      keyword: lineId,
      value: lineId,
      fraud_value: lineId,
      reason,
      description: reason,
      content: reason,
      note: reason,
      type: "LINE",
      fraud_type: "LINE",
      category: "LINE",
      status: "ACTIVE",
      level: "high",
      score: 88,
      source: "user_blacklist",
      created_at: now,
      updated_at: now,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.json({
      success: true,
      message: "已加入黑名單",
      lineId,
      data: result,
    });
  } catch (error) {
    console.error("Failed to add blacklist:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add blacklist",
      error: error.message,
    });
  }
});


async function handleLineReport(req, res) {
  const lineId = String(
    req.body.lineId ||
      req.body.line_id ||
      req.body.account ||
      req.body.value ||
      ""
  ).trim();

  const reason = String(
    req.body.reason ||
      req.body.description ||
      "使用者通報 LINE ID"
  ).trim();

  if (lineId.length < 3) {
    return res.status(400).json({
      success: false,
      message: "Invalid LINE ID",
    });
  }

  try {
    const now = new Date();

    const reportValueMap = {
      user_id: req.body.userId || req.body.user_id || 1,
      line_id: lineId,
      lineId: lineId,
      line_account: lineId,
      account: lineId,
      keyword: lineId,
      value: lineId,
      fraud_value: lineId,
      report_value: lineId,
      reason,
      description: reason,
      content: reason,
      note: reason,
      type: "LINE",
      report_type: "LINE",
      fraud_type: "LINE",
      category: "LINE",
      status: "PENDING",
      level: "high",
      score: 88,
      source: "user_report",
      created_at: now,
      updated_at: now,
      report_time: now,
      reported_at: now,
    };

    if (await tableExists("report")) {
      const reportResult = await insertIntoExistingColumns("report", reportValueMap);

      if (reportResult.success) {
        return res.json({
          success: true,
          message: "通報成功",
          lineId,
          sourceTable: "report",
          data: reportResult,
        });
      }

      console.log("report 表無法寫入，改寫 blacklist:", reportResult);
    }

    const blacklistResult = await insertIntoExistingColumns("blacklist", {
      line_id: lineId,
      lineId: lineId,
      line_account: lineId,
      account: lineId,
      keyword: lineId,
      value: lineId,
      fraud_value: lineId,
      reason: "使用者通報：" + reason,
      description: "使用者通報：" + reason,
      content: "使用者通報：" + reason,
      note: "使用者通報：" + reason,
      type: "LINE_REPORT",
      fraud_type: "LINE",
      category: "LINE",
      status: "PENDING",
      level: "high",
      score: 88,
      source: "user_report",
      created_at: now,
      updated_at: now,
    });

    if (!blacklistResult.success) {
      return res.status(500).json(blacklistResult);
    }

    return res.json({
      success: true,
      message: "通報成功",
      lineId,
      sourceTable: "blacklist",
      data: blacklistResult,
    });
  } catch (error) {
    console.error("Failed to report LINE ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to report LINE ID",
      error: error.message,
    });
  }
}

app.post("/api/report-line", handleLineReport);
app.post("/api/report", handleLineReport);
module.exports = {
  app,
  pool,
  sql,
  getSqlPool,
};

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Shield Server Running: http://0.0.0.0:${PORT}`);
});




