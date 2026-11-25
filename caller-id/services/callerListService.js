const path = require("path");

require("../../server/node_modules/dotenv").config({
  path: path.join(__dirname, "../../server/.env")
});

const sql = require("../../server/node_modules/mssql");

// Azure SQL 連線設定
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database:
    process.env.DB_NAME ||
    process.env.DB_DATABASE ||
    process.env.DATABASE,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// 轉換為 iPhone 使用的電話格式
function normalizePhoneNumber(value) {
  let phone = String(value || "")
    .replace(/[\s()+-]/g, "");

  if (phone.startsWith("00886")) {
    phone = phone.slice(2);
  }

  if (phone.startsWith("0")) {
    phone = "886" + phone.slice(1);
  }

  if (!/^8869\d{8}$/.test(phone)) {
    return null;
  }

  return Number(phone);
}

// 判斷來電分類
function getCallerType(description) {
  const text = String(description || "");

  const match = text.match(
    /【標籤】\s*([^|｜\r\n]+)/
  );

  if (!match) return null;

  const firstTag = match[1]
    .split(/[、,，]/)[0]
    .trim();

  const labels = {
    "詐騙": "AI Shield－疑似詐騙",
    "騷擾": "AI Shield－疑似騷擾",
    "貸款": "AI Shield－貸款相關",
    "推銷": "AI Shield－疑似推銷"
  };

  return labels[firstTag] || null;
}

// 讀取 Azure SQL 電話清單
async function getCallerList() {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();

    const result = await pool.request().query(`
      SELECT
        fraud_value,
        description
      FROM fraud_database
      WHERE fraud_type = 'PHONE'
        AND is_confirmed = 1
      ORDER BY fraud_id ASC
    `);

    const phoneMap = new Map();

    for (const row of result.recordset) {
      const phoneNumber =
        normalizePhoneNumber(row.fraud_value);

      const label =
        getCallerType(row.description);

      if (!phoneNumber || !label) continue;

      phoneMap.set(phoneNumber, {
        phoneNumber,
        label
      });
    }

    

    return Array.from(phoneMap.values())
    .sort((a, b) => a.phoneNumber - b.phoneNumber);


  } finally {
    await pool.close();
  }
}

module.exports = {
  getCallerList,
  normalizePhoneNumber,
  getCallerType
};