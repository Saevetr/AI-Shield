const sql = require("mssql");
const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true
});

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME ||
    process.env.DB_DATABASE ||
    process.env.DATABASE,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  connectionTimeout: 30000,
  requestTimeout: 60000,
  pool: {
    max: 2,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function connectDatabase() {
  if (!config.user || !config.password ||
      !config.server || !config.database) {
    throw new Error("Azure 資料庫環境變數不完整");
  }

  const pool = new sql.ConnectionPool(config);

  pool.on("error", error => {
    console.error("資料庫連線池異常：", error.code);
  });

  await pool.connect();

  return pool;
}

async function getExistingUrls(pool) {
  return queryExistingUrls(pool.request());
}

async function getExistingUrlsInTransaction(transaction) {
  return queryExistingUrls(
    new sql.Request(transaction)
  );
}

async function queryExistingUrls(request) {
  const result = await request.query(`
    SELECT
      fraud_id,
      fraud_value,
      source,
      is_confirmed,
      reported_count,
      description
    FROM dbo.fraud_database
    WHERE UPPER(fraud_type) = 'URL'
  `);

  return result.recordset;
}

if (require.main === module) {
  let pool;

  async function testConnection() {
    try {
      console.log("===== Azure 資料庫連線測試 =====");
      console.log("正在連接 Azure...");

      pool = await connectDatabase();

      console.log("Azure 連線成功！");

      const rows = await getExistingUrls(pool);

      console.log("現有網址資料筆數：", rows.length);
      console.log("唯讀查詢成功！");
      console.log("未執行新增、修改或刪除操作");
    } finally {
      if (pool) {
        await pool.close();
        console.log("資料庫連線已關閉");
      }
    }
  }

  testConnection().catch(error => {
    console.error("測試失敗：", error.code || error.name);
    process.exitCode = 1;
  });
}

module.exports = {
  connectDatabase,
  getExistingUrls,
  getExistingUrlsInTransaction
};
