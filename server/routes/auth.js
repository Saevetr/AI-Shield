// routes/auth.js
const express = require("express");
const router = express.Router();
const pool = require("./db"); // ⭐️ 引入同層的 db[cite: 1]

// =========================================================================
// 🚀 1. 登入功能 (Login)
// =========================================================================
router.post("/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim(); //[cite: 1]
  const password = String(req.body.password || "").trim(); //[cite: 1]

  if (!account || !password) { //[cite: 1]
    return res.status(400).json({ success: false, message: "請輸入帳號與密碼" }); //[cite: 1]
  }

  try {
    // 查詢使用者（自動相容 SQL Server）
    const [rows] = await pool.query(
      "SELECT user_id, username, email, membership_level, status FROM user WHERE (email = ? OR username = ?) AND password_hash = ? AND status = 'ACTIVE' LIMIT 1", //[cite: 1]
      [account, account, password] //[cite: 1]
    );

    if (rows.length === 0) { //[cite: 1]
      return res.status(401).json({ success: false, message: "帳號或密碼錯誤" }); //[cite: 1]
    }

    const user = rows[0]; //[cite: 1]
    
    // 更新最後登入時間
    await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", [user.user_id]); //[cite: 1]

    return res.json({ success: true, message: "登入成功", data: user }); //[cite: 1]
  } catch (error) { //[cite: 1]
    console.error("Login error:", error); //[cite: 1]
    return res.status(500).json({ success: false, message: "伺服器內部錯誤" }); //[cite: 1]
  }
});

// =========================================================================
// 🚀 2. 新增的註冊功能 (Register)
// =========================================================================
router.post("/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "").trim();

  // 防呆：檢查欄位是否填寫完整
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "所有欄位（帳號、Email、密碼）皆為必填" });
  }

  try {
    // 檢查此帳號或 Email 是否已被註冊過
    const [existingUsers] = await pool.query(
      "SELECT user_id FROM user WHERE username = ? OR email = ? LIMIT 1",
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: "該帳號或 Email 已被註冊使用" });
    }

    // 寫入新使用者資料（預設狀態為 ACTIVE，會員等級為 1）
    await pool.query(
      "INSERT INTO user (username, email, password_hash, membership_level, status, created_at) VALUES (?, ?, ?, 1, 'ACTIVE', NOW())",
      [username, email, password]
    );

    return res.status(201).json({ success: true, message: "註冊成功！請前往登入" });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ success: false, message: "伺服器內部錯誤，註冊失敗" });
  }
});

module.exports = router; //[cite: 1]