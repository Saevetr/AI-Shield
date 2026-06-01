const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// ==========================
// MySQL 資料庫連線
// ==========================

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'test_db'
});

let dbConnected = false;
let dbConnectError = null;

db.connect((err) => {
  if (err) {
    dbConnected = false;
    dbConnectError = err.message;
    console.error('❌ 資料庫連線失敗：', err.message);
    return;
  }

  dbConnected = true;
  dbConnectError = null;
  console.log('✅ 成功連線到 test_db 資料庫！');
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results);
    });
  });
}

// ==========================
// 基本測試 API
// ==========================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Shield backend is running',
    dbConnected,
    dbConnectError
  });
});

app.get('/api/db-status', async (req, res) => {
  try {
    const result = await runQuery(
      'SELECT 1 AS ok, DATABASE() AS databaseName, NOW() AS dbTime'
    );

    res.json({
      success: true,
      message: '資料庫查詢成功',
      dbConnected,
      result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '資料庫查詢失敗',
      dbConnected,
      error: err.message
    });
  }
});

app.get('/api/db-tables', async (req, res) => {
  try {
    const tables = await runQuery('SHOW TABLES');

    res.json({
      success: true,
      database: 'test_db',
      tables
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '無法讀取資料表',
      error: err.message
    });
  }
});

// ==========================
// 電話查詢
// ==========================

app.get('/api/fraud-count', async (req, res) => {
  try {
    const result = await runQuery('SELECT COUNT(*) AS total FROM fraud_database');

    res.json({
      success: true,
      table: 'fraud_database',
      count: result[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '無法讀取 fraud_database',
      error: err.message
    });
  }
});

app.get('/api/debug-phone', async (req, res) => {
  const phone = req.query.phone || '';

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: '請提供 phone，例如 /api/debug-phone?phone=0912345678'
    });
  }

  try {
    const results = await runQuery(
      'SELECT * FROM fraud_database WHERE phone = ?',
      [phone]
    );

    res.json({
      success: true,
      phone,
      found: results.length > 0,
      count: results.length,
      rows: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '電話查詢資料庫失敗',
      error: err.message
    });
  }
});

const handlePhoneQuery = async (req, res) => {
  const body = req.body || {};
  const query = req.query || {};
  const params = req.params || {};

  const searchPhone =
    query.phone ||
    params.phone ||
    body.phone ||
    query.number ||
    body.number ||
    '';

  if (!searchPhone) {
    return res.status(400).json({
      success: false,
      message: '請提供電話號碼'
    });
  }

  try {
    console.log(`🔍 查詢電話：${searchPhone}`);

    const results = await runQuery(
      'SELECT * FROM fraud_database WHERE phone = ?',
      [searchPhone]
    );

    console.log(`📦 電話資料庫查詢結果：${results.length} 筆`);

    if (!results || results.length === 0) {
      const safeData = {
        success: true,
        source: 'database_not_found',
        isScam: false,
        is_scam: false,
        status: 'safe',
        message: '安全！目前資料庫中無此號碼紀錄。',
        phone: searchPhone,
        carrier: '未知電信',
        level: 'low',
        score: 15,
        reason: ''
      };

      return res.json({
        ...safeData,
        data: safeData,
        detail: safeData
      });
    }

    const dbRow = results[0];

    const scamData = {
      success: true,
      source: 'database_found',
      isScam: true,
      is_scam: true,
      status: dbRow.status || '危險號碼',
      message: dbRow.reason || '注意！此號碼有疑似詐騙紀錄！',
      phone: dbRow.phone || searchPhone,
      carrier: dbRow.carrier || '未知電信',
      level: dbRow.level || 'high',
      score: dbRow.score || 88,
      reason: dbRow.reason || '',
      raw: dbRow
    };

    return res.json({
      ...scamData,
      data: scamData,
      detail: scamData
    });
  } catch (err) {
    console.error('❌ 電話查詢失敗：', err.message);

    return res.status(500).json({
      success: false,
      message: '資料庫查詢失敗',
      error: err.message
    });
  }
};

app.get('/api/check-phone', handlePhoneQuery);
app.get('/api/check-phone/:phone', handlePhoneQuery);
app.post('/api/check-phone', handlePhoneQuery);

app.get('/api/phone-query', handlePhoneQuery);
app.get('/api/phone-query/:phone', handlePhoneQuery);
app.post('/api/phone-query', handlePhoneQuery);

// ==========================
// LINE ID 查詢
// ==========================

app.get('/api/setup-line-table', async (req, res) => {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS line_database (
        id INT AUTO_INCREMENT PRIMARY KEY,
        line_id VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(50) DEFAULT '危險帳號',
        reason TEXT
      )
    `);

    await runQuery(`
      INSERT IGNORE INTO line_database (line_id, status, reason)
      VALUES
      ('@fake-invest', '危險帳號', '假冒投資老師，引導加入虛擬貨幣投資群組'),
      ('line_scam_001', '危險帳號', '疑似假交友詐騙帳號'),
      ('money168', '危險帳號', '高報酬投資詐騙 LINE 帳號')
    `);

    const countResult = await runQuery('SELECT COUNT(*) AS total FROM line_database');

    res.json({
      success: true,
      message: 'line_database 建立完成，測試資料已加入',
      table: 'line_database',
      count: countResult[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '建立 line_database 失敗',
      error: err.message
    });
  }
});

app.get('/api/line-count', async (req, res) => {
  try {
    const result = await runQuery('SELECT COUNT(*) AS total FROM line_database');

    res.json({
      success: true,
      table: 'line_database',
      count: result[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '無法讀取 line_database',
      error: err.message
    });
  }
});

app.get('/api/debug-line', async (req, res) => {
  const query = req.query || {};

  const lineId =
    query.lineId ||
    query.line_id ||
    query.id ||
    '';

  if (!lineId) {
    return res.status(400).json({
      success: false,
      message: '請提供 lineId，例如 /api/debug-line?lineId=@fake-invest'
    });
  }

  try {
    const results = await runQuery(
      'SELECT * FROM line_database WHERE line_id = ?',
      [lineId]
    );

    res.json({
      success: true,
      lineId,
      found: results.length > 0,
      count: results.length,
      rows: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'LINE ID 查詢資料庫失敗',
      error: err.message
    });
  }
});

const handleLineQuery = async (req, res) => {
  const body = req.body || {};
  const query = req.query || {};
  const params = req.params || {};

  const searchLineId =
    query.lineId ||
    query.line_id ||
    query.id ||
    params.lineId ||
    params.id ||
    body.lineId ||
    body.line_id ||
    body.id ||
    '';

  if (!searchLineId) {
    return res.status(400).json({
      success: false,
      message: '請提供 LINE ID'
    });
  }

  try {
    console.log(`🔍 查詢 LINE ID：${searchLineId}`);

    const results = await runQuery(
      'SELECT * FROM line_database WHERE line_id = ?',
      [searchLineId]
    );

    console.log(`📦 LINE 資料庫查詢結果：${results.length} 筆`);

    if (!results || results.length === 0) {
      const safeData = {
        success: true,
        source: 'database_not_found',
        isScam: false,
        is_scam: false,
        status: 'safe',
        message: '安全！目前資料庫中無此 LINE ID 紀錄。',
        lineId: searchLineId,
        line_id: searchLineId,
        level: 'low',
        score: 15,
        reason: ''
      };

      return res.json({
        ...safeData,
        data: safeData,
        detail: safeData
      });
    }

    const dbRow = results[0];

    const scamData = {
      success: true,
      source: 'database_found',
      isScam: true,
      is_scam: true,
      status: dbRow.status || '危險帳號',
      message: dbRow.reason || '注意！此 LINE ID 有疑似詐騙紀錄！',
      lineId: dbRow.line_id || searchLineId,
      line_id: dbRow.line_id || searchLineId,
      level: dbRow.level || 'high',
      score: dbRow.score || 88,
      reason: dbRow.reason || '',
      raw: dbRow
    };

    return res.json({
      ...scamData,
      data: scamData,
      detail: scamData
    });
  } catch (err) {
    console.error('❌ LINE ID 查詢失敗：', err.message);

    return res.status(500).json({
      success: false,
      message: 'LINE ID 資料庫查詢失敗',
      error: err.message
    });
  }
};

app.get('/api/check-line', handleLineQuery);
app.get('/api/check-line/:lineId', handleLineQuery);
app.post('/api/check-line', handleLineQuery);

app.get('/api/line-query', handleLineQuery);
app.get('/api/line-query/:lineId', handleLineQuery);
app.post('/api/line-query', handleLineQuery);

// ==========================
// 訊息分析
// ==========================

app.get('/api/setup-message-table', async (req, res) => {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS message_keywords (
        id INT AUTO_INCREMENT PRIMARY KEY,
        keyword VARCHAR(100) NOT NULL UNIQUE,
        level VARCHAR(20) DEFAULT 'high',
        score INT DEFAULT 80,
        reason TEXT
      )
    `);

    await runQuery(`
      INSERT IGNORE INTO message_keywords (keyword, level, score, reason)
      VALUES
      ('穩賺不賠', 'high', 90, '常見投資詐騙話術，宣稱穩賺不賠'),
      ('保證獲利', 'high', 88, '詐騙訊息常以保證獲利誘導投資'),
      ('虛擬貨幣', 'high', 82, '疑似虛擬貨幣投資詐騙關鍵字'),
      ('投資群組', 'high', 86, '常見誘導加入投資群組話術'),
      ('私下匯款', 'high', 85, '要求私下匯款具有高風險'),
      ('限時優惠', 'medium', 55, '可能為促銷或釣魚訊息，建議查證'),
      ('點擊連結', 'medium', 60, '含連結訊息需注意釣魚風險')
    `);

    const countResult = await runQuery('SELECT COUNT(*) AS total FROM message_keywords');

    res.json({
      success: true,
      message: 'message_keywords 建立完成，測試資料已加入',
      table: 'message_keywords',
      count: countResult[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '建立 message_keywords 失敗',
      error: err.message
    });
  }
});

app.get('/api/message-keyword-count', async (req, res) => {
  try {
    const result = await runQuery('SELECT COUNT(*) AS total FROM message_keywords');

    res.json({
      success: true,
      table: 'message_keywords',
      count: result[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '無法讀取 message_keywords',
      error: err.message
    });
  }
});

const handleMessageAnalysis = async (req, res) => {
  const body = req.body || {};
  const query = req.query || {};

  const inputMessage =
    body.message ||
    query.message ||
    body.text ||
    query.text ||
    '';

  if (!inputMessage || String(inputMessage).trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: '請提供要分析的訊息內容'
    });
  }

  try {
    const messageText = String(inputMessage);

    console.log(`🔍 分析訊息：${messageText}`);

    const keywords = await runQuery('SELECT * FROM message_keywords');

    const matched = keywords.filter((item) => {
      return messageText.includes(item.keyword);
    });

    console.log(`📦 訊息關鍵字命中：${matched.length} 筆`);

    if (matched.length === 0) {
      const safeData = {
        success: true,
        source: 'database_not_found',
        isScam: false,
        is_scam: false,
        status: 'safe',
        message: '目前未偵測到明顯詐騙關鍵字，但仍請保持警覺。',
        level: 'low',
        score: 15,
        matchedKeywords: [],
        reason: '資料庫中沒有命中高風險關鍵字。'
      };

      return res.json({
        ...safeData,
        data: safeData,
        detail: safeData
      });
    }

    const highestScore = Math.max(
      ...matched.map((item) => Number(item.score) || 80)
    );

    const highestLevel =
      highestScore >= 80 ? 'high' : highestScore >= 50 ? 'medium' : 'low';

    const reasons = matched.map((item) => item.reason).filter(Boolean);
    const matchedKeywords = matched.map((item) => item.keyword);

    const scamData = {
      success: true,
      source: 'database_found',
      isScam: highestLevel !== 'low',
      is_scam: highestLevel !== 'low',
      status: highestLevel === 'high' ? '高風險訊息' : '可疑訊息',
      message:
        reasons.length > 0
          ? reasons.join('；')
          : '此訊息命中可疑詐騙關鍵字。',
      level: highestLevel,
      score: highestScore,
      matchedKeywords,
      reason: reasons.length > 0 ? reasons.join('；') : '',
      raw: matched
    };

    return res.json({
      ...scamData,
      data: scamData,
      detail: scamData
    });
  } catch (err) {
    console.error('❌ 訊息分析失敗：', err.message);

    return res.status(500).json({
      success: false,
      message: '訊息分析資料庫查詢失敗',
      error: err.message
    });
  }
};

app.get('/api/analyze-message', handleMessageAnalysis);
app.post('/api/analyze-message', handleMessageAnalysis);

app.get('/api/message-query', handleMessageAnalysis);
app.post('/api/message-query', handleMessageAnalysis);

// ==========================
// 黑名單
// ==========================

app.get('/api/setup-blacklist-table', async (req, res) => {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        value VARCHAR(100) NOT NULL UNIQUE,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await runQuery(`
      INSERT IGNORE INTO blacklist (type, value, note)
      VALUES
      ('電話', '+886 987 654 321', '測試資料：可疑電話'),
      ('LINE ID', '@1234', '測試資料：可疑 LINE 帳號')
    `);

    const countResult = await runQuery('SELECT COUNT(*) AS total FROM blacklist');

    res.json({
      success: true,
      message: 'blacklist 建立完成，測試資料已加入',
      table: 'blacklist',
      count: countResult[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '建立 blacklist 失敗',
      error: err.message
    });
  }
});

app.get('/api/blacklist-count', async (req, res) => {
  try {
    const result = await runQuery('SELECT COUNT(*) AS total FROM blacklist');

    res.json({
      success: true,
      table: 'blacklist',
      count: result[0].total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '無法讀取 blacklist',
      error: err.message
    });
  }
});

app.get('/api/blacklist', async (req, res) => {
  const query = req.query || {};
  const type = query.type || '';

  try {
    let results;

    if (type && type !== '全部') {
      results = await runQuery(
        'SELECT * FROM blacklist WHERE type = ? ORDER BY created_at DESC, id DESC',
        [type]
      );
    } else {
      results = await runQuery(
        'SELECT * FROM blacklist ORDER BY created_at DESC, id DESC'
      );
    }

    res.json({
      success: true,
      source: 'database',
      count: results.length,
      items: results,
      data: results
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '讀取黑名單失敗',
      error: err.message
    });
  }
});

app.post('/api/blacklist', async (req, res) => {
  const body = req.body || {};

  const type = body.type || '';
  const value = body.value || '';
  const note = body.note || '';

  if (!type || !value) {
    return res.status(400).json({
      success: false,
      message: '請提供 type 與 value'
    });
  }

  if (type !== '電話' && type !== 'LINE ID') {
    return res.status(400).json({
      success: false,
      message: 'type 只能是 電話 或 LINE ID'
    });
  }

  try {
    const result = await runQuery(
      'INSERT INTO blacklist (type, value, note) VALUES (?, ?, ?)',
      [type, value, note || '使用者自行加入']
    );

    const rows = await runQuery(
      'SELECT * FROM blacklist WHERE id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      message: '新增黑名單成功',
      item: rows[0],
      data: rows[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: '此資料已存在黑名單中',
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      message: '新增黑名單失敗',
      error: err.message
    });
  }
});

app.delete('/api/blacklist/:id', async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: '請提供 id'
    });
  }

  try {
    const result = await runQuery(
      'DELETE FROM blacklist WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '刪除黑名單成功',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '刪除黑名單失敗',
      error: err.message
    });
  }
});

// 瀏覽器測試用：不用 POST 也可以新增
app.get('/api/add-blacklist', async (req, res) => {
  const query = req.query || {};

  const type = query.type || '';
  const value = query.value || '';
  const note = query.note || '';

  if (!type || !value) {
    return res.status(400).json({
      success: false,
      message: '請提供 type 與 value，例如 /api/add-blacklist?type=電話&value=0912345678'
    });
  }

  try {
    const result = await runQuery(
      'INSERT INTO blacklist (type, value, note) VALUES (?, ?, ?)',
      [type, value, note || '使用者自行加入']
    );

    const rows = await runQuery(
      'SELECT * FROM blacklist WHERE id = ?',
      [result.insertId]
    );

    res.json({
      success: true,
      message: '新增黑名單成功',
      item: rows[0],
      data: rows[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: '此資料已存在黑名單中',
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      message: '新增黑名單失敗',
      error: err.message
    });
  }
});

// ==========================
// 啟動後端
// ==========================

app.listen(3000, () => {
  console.log('🚀 後端已在 http://localhost:3000 啟動');
});