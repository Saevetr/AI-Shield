// routes/auth.js
const express = require("express");
const router = express.Router();
const pool = require("./db"); // ⭐️ 確保引入同層的 db

const redirectToFrontend = (status, msg) => {
  const expoAppUrl = "exp://127.0.0.1:8081";
  return `${expoAppUrl}?status=${status}&message=${encodeURIComponent(msg)}`;
};

router.post("/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!account || !password) {
    return res.status(400).json({ success: false, message: "請輸入帳號與密碼" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT user_id, username, email, membership_level, status FROM user WHERE (email = ? OR username = ?) AND password_hash = ? AND status = 'ACTIVE' LIMIT 1",
      [account, account, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
    }

    const user = rows[0];
    await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?", [user.user_id]);

    res.json({ success: true, message: "登入成功", data: user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "伺服器內部錯誤" });
  }
});

module.exports = router;