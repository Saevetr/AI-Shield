// routes/auth.js
const express = require("express");
const router = express.Router();
const pool = require("./db"); // ⭐️ 引入同層的 db

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
    const [rows] = await pool.query(
      "SELECT user_id, username, email, phone, membership_level, status FROM user WHERE (email = ? OR username = ? OR phone = ?) AND password_hash = ? AND status = 'ACTIVE' LIMIT 1",
      [account, account, account, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
    }

    const user = rows[0];
    await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", [user.user_id]);

    return res.json({ success: true, message: "登入成功", data: user });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "伺服器內部錯誤" });
  }
});

// =========================================================================
// 🚀 2. 註冊功能 (Register) - 完美支援使用者名稱、Email、電話
// =========================================================================
router.post("/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "").trim();

  // 1. 防呆：檢查欄位是否填寫完整
  if (!username || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "所有欄位皆為必填項目" });
  }

  try {
    // 2. 檢查此 使用者名稱、Email 或 電話 是否已被註冊過
    const [existingUsers] = await pool.query(
      "SELECT user_id FROM user WHERE username = ? OR email = ? OR phone = ? LIMIT 1",
      [username, email, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "該使用者名稱、Email 或電話號碼已被註冊使用" });
    }

    // 3. 寫入新使用者資料（對齊你的資料庫欄位，預設狀態 ACTIVE，會員等級 1）
    await pool.query(
      "INSERT INTO user (username, email, phone, password_hash, membership_level, status, created_at) VALUES (?, ?, ?, ?, 1, 'ACTIVE', NOW())",
      [username, email, phone, password]
    );

    return res.status(201).json({ success: true, message: "註冊成功！請前往登入" });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "伺服器內部錯誤，註冊失敗" });
  }
});

module.exports = router;