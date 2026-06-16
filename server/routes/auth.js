// routes/auth.js
const express = require("express");
const router = express.Router();
const pool = require("./db");

// 一般登入
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
    console.error("Failed to login:", error);
    res.status(500).json({ success: false, message: "Failed to login", error: error.message });
  }
});

// 一般註冊
router.post("/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "").trim();

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Username, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  try {
    const [existingUsers] = await pool.query("SELECT user_id FROM `user` WHERE email = ? OR username = ? LIMIT 1", [email, username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: "Email or username already exists" });
    }

    const customerId = `CUST${Date.now()}`;
    const [result] = await pool.query(
      "INSERT INTO `user` (username, email, password_hash, membership_level, is_verified, status, customer_id) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)",
      [username, email, password, customerId]
    );

    res.status(201).json({
      success: true,
      message: "Register successful",
      data: { user_id: result.insertId, username, email, membership_level: "FREE", is_verified: 1, status: "ACTIVE", customer_id: customerId },
    });
  } catch (error) {
    console.error("Failed to register:", error);
    res.status(500).json({ success: false, message: "Failed to register", error: error.message });
  }
});

// Google 登入
router.post("/google-login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const username = String(req.body.username || req.body.displayName || req.body.name || email.split("@")[0] || "").trim();
  const googleId = String(req.body.googleId || req.body.uid || "").trim();

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const [existingUsers] = await pool.query("SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM user WHERE email = ? LIMIT 1", [email]);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE user_id = ?", [user.user_id]);
      return res.json({ success: true, message: "Google login successful", data: { ...user, last_login: new Date() } });
    }

    const customerId = "GOOGLE" + Date.now();
    const [result] = await pool.query("INSERT INTO user (username, email, password_hash, membership_level, is_verified, status, customer_id) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)", [username || email.split("@")[0], email, googleId || "GOOGLE_LOGIN", customerId]);

    res.status(201).json({
      success: true,
      message: "Google register and login successful",
      data: { user_id: result.insertId, username: username || email.split("@")[0], email, membership_level: "FREE", is_verified: 1, status: "ACTIVE", customer_id: customerId },
    });
  } catch (error) {
    console.error("Failed to login with Google:", error);
    res.status(500).json({ success: false, message: "Failed to login with Google", error: error.message });
  }
});

// LINE 登入跳轉
router.get("/line-login", (req, res) => {
  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = process.env.LINE_REDIRECT_URI;

  if (!channelId || !redirectUri) {
    return res.status(500).json({ success: false, message: "LINE login settings are missing" });
  }

  const state = "line_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const params = new URLSearchParams({ response_type: "code", client_id: channelId, redirect_uri: redirectUri, state, scope: "profile openid" });

  res.redirect("https://access.line.me/oauth2/v2.1/authorize?" + params.toString());
});

// LINE 登入回呼 (Callback)
router.get("/line-login/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const error = String(req.query.error || "");
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8082";

  const redirectToFrontend = (status, message) => {
    const target = new URL("/line-callback", frontendUrl);
    target.searchParams.set("status", status);
    if (message) target.searchParams.set("message", message);
    return target.toString();
  };

  if (error) return res.redirect(redirectToFrontend("failed", error));
  if (!code) return res.redirect(redirectToFrontend("failed", "Missing LINE code"));

  try {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code", code,
      redirect_uri: process.env.LINE_REDIRECT_URI || "",
      client_id: process.env.LINE_CHANNEL_ID || "",
      client_secret: process.env.LINE_CHANNEL_SECRET || "",
    });

    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: tokenParams.toString(),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to get LINE token");
    }

    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: "Bearer " + tokenData.access_token },
    });
    const profile = await profileResponse.json();

    if (!profileResponse.ok) throw new Error("Failed to get LINE profile");

    const lineUserId = String(profile.userId || "");
    const displayName = String(profile.displayName || "LINE User").trim();

    if (!lineUserId) throw new Error("Missing LINE user id");

    const lineEmail = "line_" + lineUserId + "@line.local";
    const username = (displayName || "LINE User") + "_" + lineUserId.slice(-6);
    const customerId = "LINE" + Date.now();

    const [existingUsers] = await pool.query("SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM user WHERE email = ? LIMIT 1", [lineEmail]);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE user_id = ?", [user.user_id]);
      return res.redirect(redirectToFrontend("success", "LINE login successful"));
    }

    await pool.query("INSERT INTO user (username, email, password_hash, membership_level, is_verified, status, customer_id) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)", [username, lineEmail, lineUserId, customerId]);
    res.redirect(redirectToFrontend("success", "LINE register and login successful"));
  } catch (error) {
    console.error("Failed to login with LINE:", error);
    res.redirect(redirectToFrontend("failed", error instanceof Error ? error.message : "LINE login failed"));
  }
});

module.exports = router;