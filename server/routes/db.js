const sql = require("mssql");
require("dotenv").config();

const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === "") return defaultValue;
  return String(value).trim().toLowerCase() === "true";
};

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.DATABASE,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: parseBoolean(process.env.DB_ENCRYPT, true),
    trustServerCertificate: parseBoolean(
      process.env.DB_TRUST_SERVER_CERTIFICATE,
      false
    ),
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

const getPool = async () => {
  // ⭐️ 核心修正：如果連線池存在，但它已經不是連接狀態，就將其清空重連
  if (poolPromise) {
    try {
      const pool = await poolPromise;
      if (pool.connected) {
        return poolPromise; // 只有在確定連線活著時才複用
      }
    } catch (e) {
      poolPromise = null;
    }
  }

  if (!dbConfig.server || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
    throw new Error("Database environment variables are missing");
  }

  // ⭐️ 建立新的連線池，並主動監聽內部的 error 事件，防止它變成 fatal 崩潰
  const pool = new sql.ConnectionPool(dbConfig);
  
  pool.on("error", (err) => {
    console.error("⚠️ MSSQL Connection Pool Error:", err.message);
    if (err.code === "ECONNRESET") {
      console.log("🔄 偵測到連線被重置，清空快取以便下次請求重新連線。");
      poolPromise = null; // 發生 ECONNRESET 時，主動清空，下次請求就會走 getPool 重新連線
      try {
        pool.close();
      } catch (closeErr) {
        // 忽略關閉失敗的錯誤
      }
    }
  });

  poolPromise = pool.connect().catch((err) => {
    console.error("❌ SQL Server connection failed:", err.message);
    poolPromise = null; // 連線失敗就清空
    throw err;
  });

  return poolPromise;
};

// ==========================================
// 以下你原本的 SQL 轉換與常規化邏輯保持不變
// ==========================================
const replaceQuestionMarks = (queryText) => {
  let index = 0;
  return queryText.replace(/\?/g, () => {
    const key = `@p${index}`;
    index += 1;
    return key;
  });
};

const convertLimitToTop = (queryText) => {
  const limitMatch = queryText.match(/\s+LIMIT\s+(\d+)\s*;?\s*$/i);
  if (!limitMatch) return queryText;

  const limit = limitMatch[1];
  let sqlText = queryText.replace(/\s+LIMIT\s+\d+\s*;?\s*$/i, "");

  if (/^\s*SELECT\s+TOP\s*\(/i.test(sqlText)) return sqlText;

  sqlText = sqlText.replace(/^\s*SELECT\s+/i, `SELECT TOP (${limit}) `);
  return sqlText;
};

const normalizeSql = (queryText) => {
  let sqlText = queryText;
  sqlText = sqlText.replace(/`([^`]+)`/g, "[$1]");
  sqlText = sqlText.replace(/\bFROM\s+user\b/gi, "FROM [user]");
  sqlText = sqlText.replace(/\bUPDATE\s+user\b/gi, "UPDATE [user]");
  sqlText = sqlText.replace(/\bINTO\s+user\b/gi, "INTO [user]");
  sqlText = sqlText.replace(/\bNOW\(\)/gi, "GETDATE()");
  sqlText = convertLimitToTop(sqlText);
  sqlText = replaceQuestionMarks(sqlText);
  return sqlText;
};

const query = async (queryText, params = []) => {
  try {
    const pool = await getPool();
    const request = pool.request();

    params.forEach((value, index) => {
      request.input(`p${index}`, value === undefined ? null : value);
    });

    const sqlText = normalizeSql(queryText);
    const result = await request.query(sqlText);

    return [result.recordset || []];
  } catch (error) {
    // ⭐️ 在這裡把錯誤往外拋，讓外層的路由（如 auth.js）能捕獲，而不是直接讓 Node 死掉
    console.error("❌ db.js Query Execution Error:", error.message);
    throw error;
  }
};

module.exports = {
  query,
  sql,
  getPool,
};
