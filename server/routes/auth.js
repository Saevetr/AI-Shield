// auth.js
const express = require("express");
const router = express.Router();
const pool = require("./db"); // 引入剛剛獨立出去的 db

// 一般登入 API
router.post("/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!account || !password) {
    return res.status(400).json({ success: false, message: "Account and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM `user` WHERE (email = ? OR username = ?) AND password_hash = ? AND status = 'ACTIVE' LIMIT 1",
      [account, account, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid account or password" });
    }

    const user = rows[0];
    await pool.query("UPDATE `user` SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", [user.user_id]);

    res.json({ success: true, message: "Login successful", data: { ...user, last_login: new Date() } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// LINE 第三方登入回呼 (Callback) 與註冊
router.get("/line/callback", async (req, res) => {
  // 這裡放置你原本在 index.js 尾部或 auth.js 裡的 LINE 認證跳轉邏輯
  // 範例結構：
  try {
    const { code, state } = req.query;
    // 進行 LINE 權杖驗證與資料庫查詢、寫入...
    // 成功後跳轉回 Expo
    const finalToken = "JWT_OR_SESSION_TOKEN_HERE";
    const expoAppUrl = "exp://127.0.0.1:8081"; 
    
    return res.send(`
      <html>
        <body>
          <p style="text-align:center; margin-top:50px;">驗證成功！正在返回 App...</p>
          <script>
            window.location.href = "${expoAppUrl}?success=true&token=${finalToken}";
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("LINE callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

module.exports = router;