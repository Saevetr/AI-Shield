// routes/auth.js
const express = require("express");
const router = express.Router();
// ⭐️ 引入你自訂的 mssql 查詢工具（內含 query 方法）
const db = require("./db"); 

// =========================================================================
// 🚀 1. 登入功能 (Login)
// =========================================================================
router.post("/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!account || !password) {
    return res.status(400).json({ success: false, message: "請輸入帳號與密碼" });
  }

  try {
    // ⭐️ 改用你導出的 db.query(...)，且參數用陣列 [account, account, account, password] 傳入
    // 這裡我們直接對 [user] 表加上中括號，確保 MSSQL 不會當作保留字報錯
    const [rows] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status FROM [user] WHERE (email = ? OR username = ? OR phone = ?) AND password_hash = ? AND status = 'ACTIVE' LIMIT 1",
      [account, account, account, password]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
    }

    const user = rows[0];
    
    // 更新最後登入時間（直接手動轉為 MSSQL 的 GETDATE() 與 [user] 格式避免轉換失敗）
    await db.query("UPDATE [user] SET last_login = GETDATE() WHERE user_id = ?", [user.user_id]);

    return res.json({ success: true, message: "登入成功", data: user });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "伺服器內部錯誤", 
      error: error.message 
    });
  }
});

// =========================================================================
// 🚀 2. 註冊功能 (Register)
// =========================================================================
router.post("/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "").trim();

  if (!username || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "所有欄位皆為必填項目" });
  }

  try {
    // 檢查此 使用者名稱、Email 或 電話 是否已被註冊過
    const [existingUsers] = await db.query(
      "SELECT user_id FROM [user] WHERE username = ? OR email = ? OR phone = ? LIMIT 1",
      [username, email, phone]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "該使用者名稱、Email 或電話號碼已被註冊使用" });
    }

    // 寫入新使用者資料（手動對齊 MSSQL 的 GETDATE() 與 [user]）
    await db.query(
      "INSERT INTO [user] (username, email, phone, password_hash, membership_level, status, created_at) VALUES (?, ?, ?, ?, 1, 'ACTIVE', GETDATE())",
      [username, email, phone, password]
    );

    return res.status(201).json({ success: true, message: "註冊成功！請前往登入" });
  } catch (error) {
    console.error("❌ Register error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "伺服器內部錯誤，註冊失敗", 
      error: error.message 
    });
  }
});

// =========================================================================
// 🚀 3. 同步重設後的密碼到 MySQL/MSSQL (Sync Password)
// =========================================================================
router.post("/sync-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const newPassword = String(req.body.newPassword || "").trim();

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: "資料不完整" });
  }

  try {
    // 檢查該使用者是否存在
    const [users] = await db.query("SELECT user_id FROM [user] WHERE email = ? LIMIT 1", [email]);
    
    if (!users || users.length === 0) {
      return res.status(444).json({ success: false, message: "找不到該電子郵件對應的使用者" });
    }

    // 更新密碼
    await db.query(
      "UPDATE [user] SET password_hash = ? WHERE email = ?",
      [newPassword, email]
    );

    return res.json({ success: true, message: "資料庫密碼已成功同步更新！" });
  } catch (error) {
    console.error("❌ Sync password error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "伺服器內部錯誤，密碼同步失敗", 
      error: error.message 
    });
  }
});

module.exports = router;