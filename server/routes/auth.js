const express = require("express");
const router = express.Router();
const pool = require("./db");

const getRows = (result) => {
  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      return result[0];
    }

    if (result[0]?.recordset) {
      return result[0].recordset;
    }

    return result;
  }

  if (result?.recordset) {
    return result.recordset;
  }

  return [];
};

// 一般登入 API
router.post("/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!account || !password) {
    return res.status(400).json({
      success: false,
      message: "Account and password are required",
    });
  }

  try {
    const result = await pool.query(
      "SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM `user` WHERE (email = ? OR username = ?) AND password_hash = ? AND status = 'ACTIVE' LIMIT 1",
      [account, account, password]
    );

    const rows = getRows(result);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid account or password",
      });
    }

    const user = rows[0];

    await pool.query(
      "UPDATE `user` SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
      [user.user_id]
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        ...user,
        last_login: new Date(),
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// 一般註冊 API
router.post("/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "").trim();

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Username, email and password are required",
    });
  }

  try {
    const existingResult = await pool.query(
      "SELECT user_id FROM `user` WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );

    const existingRows = getRows(existingResult);

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email or username already exists",
      });
    }

    try {
      await pool.query(
        "INSERT INTO `user` (username, email, phone, password_hash, membership_level, is_verified, status, created_at) VALUES (?, ?, ?, ?, 'FREE', 1, 'ACTIVE', CURRENT_TIMESTAMP)",
        [username, email, phone, password]
      );
    } catch (fullInsertError) {
      console.log("Register full insert failed, retry minimal:", fullInsertError.message);

      await pool.query(
        "INSERT INTO `user` (username, email, password_hash, status) VALUES (?, ?, ?, 'ACTIVE')",
        [username, email, password]
      );
    }

    const userResult = await pool.query(
      "SELECT user_id, username, email, membership_level, created_at, is_verified, status, customer_id FROM `user` WHERE email = ? LIMIT 1",
      [email]
    );

    const userRows = getRows(userResult);

    res.status(201).json({
      success: true,
      message: "Register successful",
      data: userRows[0] || {
        username,
        email,
        phone,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// LINE 第三方登入回呼
router.get("/line/callback", async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8089";

    const target = new URL("/line-callback", frontendUrl);
    target.searchParams.set("success", "true");
    target.searchParams.set("token", "JWT_OR_SESSION_TOKEN_HERE");

    res.redirect(target.toString());
  } catch (error) {
    console.error("LINE callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

module.exports = router;
