const sql = require("mssql");
require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

const getPool = async () => {
  if (poolPromise) {
    return poolPromise;
  }

  if (!dbConfig.server || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
    throw new Error("Database environment variables are missing");
  }

  poolPromise = new sql.ConnectionPool(dbConfig).connect();

  return poolPromise;
};

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

  if (!limitMatch) {
    return queryText;
  }

  const limit = limitMatch[1];

  let sqlText = queryText.replace(/\s+LIMIT\s+\d+\s*;?\s*$/i, "");

  if (/^\s*SELECT\s+TOP\s*\(/i.test(sqlText)) {
    return sqlText;
  }

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
  const pool = await getPool();
  const request = pool.request();

  params.forEach((value, index) => {
    request.input(`p${index}`, value === undefined ? null : value);
  });

  const sqlText = normalizeSql(queryText);

  const result = await request.query(sqlText);

  return [result.recordset || []];
};

module.exports = {
  query,
  sql,
  getPool,
};
