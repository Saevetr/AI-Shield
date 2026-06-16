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

// ==========================================
// 🌟 Google 登入跳轉
// ==========================================
router.get("/google-login", (req, res) => {
  const { redirect_uri } = req.query; 
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const backendRedirectUri = process.env.GOOGLE_REDIRECT_URI; 

  if (!clientId || !backendRedirectUri) {
    return res.status(500).json({ success: false, message: "Google OAuth settings are missing in backend" });
  }

  const state = encodeURIComponent(redirect_uri || "");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: backendRedirectUri,
    state: state, 
    scope: "profile email",
  });

  res.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString());
});

// ==========================================
// 🌟 修改後的 Google 登入回呼 (Callback)
// ==========================================
router.get("/google-callback", async (req, res) => {
  const { code, state } = req.query;
  const expoAppUrl = state ? decodeURIComponent(state) : "exp://";

  if (!code) {
    return res.send(`
      <html>
        <body>
          <script>
            window.location.href = "${expoAppUrl}?success=false&message=Missing_code";
          </script>
        </body>
      </html>
    `);
  }

  try {
    // 1. 打向 Google API，用 code 交換 Token
    const tokenParams = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to get Google token");
    }

    // 2. 使用 Access Token 拿使用者的 Google Profile 資料
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: "Bearer " + tokenData.access_token },
    });
    const googleUser = await userResponse.json();

    if (!userResponse.ok) throw new Error("Failed to get Google user info");

    const googleUserId = String(googleUser.id || "");
    const googleEmail = String(googleUser.email || "").trim().toLowerCase();
    const displayName = String(googleUser.name || "Google User").trim();

    if (!googleUserId || !googleEmail) throw new Error("Missing Google user data");

    const username = (displayName || "Google User") + "_" + googleUserId.slice(-6);
    const customerId = "GGL" + Date.now();

    // 3. 檢查資料庫是否已存在該 Email 的使用者
    const [existingUsers] = await pool.query(
      "SELECT user_id, username, email, membership_level, created_at, is_verified, status, last_login, customer_id FROM user WHERE email = ? LIMIT 1", 
      [googleEmail]
    );

    let finalToken = "google_success_auth"; // 這邊可以根據需求換成你自己核發的 JWT Token

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE user_id = ?", [user.user_id]);
      
      // 🌟 改用 HTML 強制手機跳轉，不再使用 res.redirect
      return res.send(`
        <html>
          <head><title>Authentication Success</title></head>
          <body>
            <p style="font-size:18px; text-align:center; margin-top:50px;">驗證成功！正在返回 App...</p>
            <script>
              window.location.href = "${expoAppUrl}?success=true&token=${finalToken}";
              setTimeout(function() { window.location.href = "${expoAppUrl}?success=true&token=${finalToken}"; }, 500);
            </script>
          </body>
        </html>
      `);
    }

    // 使用者不存在 -> 自動註冊進入資料庫
    await pool.query(
      "INSERT INTO user (username, email, password_hash, membership_level, is_verified, status, customer_id) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)", 
      [username, googleEmail, googleUserId, customerId]
    );
    
    // 🌟 改用 HTML 強制手機跳轉
    return res.send(`
      <html>
        <head><title>Authentication Success</title></head>
        <body>
          <p style="font-size:18px; text-align:center; margin-top:50px;">註冊成功！正在返回 App...</p>
          <script>
            window.location.href = "${expoAppUrl}?success=true&token=${finalToken}";
            setTimeout(function() { window.location.href = "${expoAppUrl}?success=true&token=${finalToken}"; }, 500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Failed to login with Google:", error);
    const errorMsg = encodeURIComponent(error.message);
    return res.send(`
      <html>
        <body>
          <script>
            window.location.href = "${expoAppUrl}?success=false&message=${errorMsg}";
          </script>
        </body>
      </html>
    `);
  }
});


// ==========================================
// 🌟 LINE 登入跳轉
// ==========================================
router.get("/line-login", (req, res) => {
  const { redirect_uri } = req.query; 
  const channelId = process.env.LINE_CHANNEL_ID;
  const redirectUri = process.env.LINE_REDIRECT_URI;

  if (!channelId || !redirectUri) {
    return res.status(500).json({ success: false, message: "LINE login settings are missing" });
  }

  const state = "line_" + Date.now() + "_" + encodeURIComponent(redirect_uri || "");
  const params = new URLSearchParams({ response_type: "code", client_id: channelId, redirect_uri: redirectUri, state, scope: "profile openid" });

  res.redirect("https://access.line.me/oauth2/v2.1/authorize?" + params.toString());
});

// ==========================================
// 🌟 修改後的 LINE 登入回呼 (Callback)
// ==========================================
router.get("/line-login/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const error = String(req.query.error || "");
  const state = String(req.query.state || "");

  let expoAppUrl = "exp://";
  if (state.includes("_")) {
    const parts = state.split("_");
    if (parts.length >= 3) {
      expoAppUrl = decodeURIComponent(parts.slice(2).join("_"));
    }
  }

  if (error) {
    return res.send(`
      <html>
        <body>
          <script>
            window.location.href = "${expoAppUrl}?success=false&message=${encodeURIComponent(error)}";
          </script>
        </body>
      </html>
    `);
  }
  if (!code) {
    return res.send(`
      <html>
        <body>
          <script>
            window.location.href = "${expoAppUrl}?success=false&message=Missing_code";
          </script>
        </body>
      </html>
    `);
  }

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

    let finalToken = "line_success_auth";

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      await pool.query("UPDATE user SET last_login = CURRENT_TIMESTAMP, status = 'ACTIVE' WHERE user_id = ?", [user.user_id]);
      
      // 🌟 改用 HTML 強制手機跳轉
      return res.send(`
        <html>
          <head><title>Authentication Success</title></head>
          <body>
            <p style="font-size:18px; text-align:center; margin-top:50px;">驗證成功！正在返回 App...</p>
            <script>
              window.location.href = "${expoAppUrl}?success=true&token=${finalToken}";
              setTimeout(function() { window.location.href = "${expoAppUrl}?success=true&token=${finalToken}"; }, 500);
            </script>
          </body>
        </html>
      `);
    }

    await pool.query("INSERT INTO user (username, email, password_hash, membership_level, is_verified, status, customer_id) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?)", [username, lineEmail, lineUserId, customerId]);
    
    // 🌟 改用 HTML 強制手機跳轉
    return res.send(`
      <html>
        <head><title>Authentication Success</title></head>
        <body>
          <p style="font-size:18px; text-align:center; margin-top:50px;">註冊成功！正在返回 App...</p>
          <script>
            window.location.href = "${expoAppUrl}?success=true&token=${finalToken}";
            setTimeout(function() { window.location.href = "${expoAppUrl}?success=true&token=${finalToken}"; }, 500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Failed to login with LINE:", error);
    const errorMsg = encodeURIComponent(error.message);
    return res.send(`
      <html>
        <body>
          <script>
            window.location.href = "${expoAppUrl}?success=false&message=${errorMsg}";
          </script>
        </body>
      </html>
    `);
  }
});

module.exports = router;