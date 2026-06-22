// routes/auth.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
// ⭐️ 引入你自訂的 mssql 查詢工具（內含 query 方法）
const db = require("./db"); 

const buildCustomerId = (prefix = "CUST") =>
  `${prefix}${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const verifyFirebaseGoogleUser = async (idToken) => {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    "AIzaSyCqbG_5E4N2gjIDzwl0W70V-OxpXSAr1fI";

  if (!apiKey) {
    throw new Error("Firebase backend settings are missing");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await response.json();

  if (!response.ok || !Array.isArray(data.users) || data.users.length === 0) {
    throw new Error(data?.error?.message || "Invalid Firebase ID token");
  }

  const firebaseUser = data.users[0];
  const googleProvider = firebaseUser.providerUserInfo?.find(
    (provider) => provider.providerId === "google.com"
  );

  if (!firebaseUser.email || !googleProvider) {
    throw new Error("This Firebase account is not a Google account");
  }

  return {
    uid: String(firebaseUser.localId),
    email: String(firebaseUser.email).trim().toLowerCase(),
    displayName: String(
      firebaseUser.displayName || googleProvider.displayName || firebaseUser.email.split("@")[0]
    ).trim(),
  };
};

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

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "密碼至少需要 6 位數" });
  }

  try {
    // 檢查此 使用者名稱、Email 或 電話 是否已被註冊過
    const [existingUsers] = await db.query(
      "SELECT user_id FROM [user] WHERE username = ? OR email = ? OR phone = ? LIMIT 1",
      [username, email, phone]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: "該使用者名稱、Email 或電話號碼已被註冊使用" });
    }

    const customerId = buildCustomerId();

    await db.query(
      "INSERT INTO [user] (username, email, phone, password_hash, membership_level, is_verified, status, customer_id, created_at) VALUES (?, ?, ?, ?, 'FREE', 1, 'ACTIVE', ?, GETDATE())",
      [username, email, phone, password, customerId]
    );

    const [users] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status, customer_id FROM [user] WHERE email = ? LIMIT 1",
      [email]
    );

    return res.status(201).json({
      success: true,
      message: "註冊成功！請前往登入",
      data: users[0],
    });
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

// =========================================================================
// Google 登入：由 Firebase 驗證 Google 身分，再同步 Azure SQL 使用者
// =========================================================================
router.post("/google-login", async (req, res) => {
  const idToken = String(req.body.idToken || "").trim();

  if (!idToken) {
    return res.status(400).json({ success: false, message: "缺少 Google 登入憑證" });
  }

  try {
    const googleUser = await verifyFirebaseGoogleUser(idToken);
    const [existingUsers] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status, customer_id FROM [user] WHERE email = ? LIMIT 1",
      [googleUser.email]
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      await db.query(
        "UPDATE [user] SET last_login = GETDATE(), is_verified = 1, status = 'ACTIVE' WHERE user_id = ?",
        [user.user_id]
      );

      return res.json({
        success: true,
        message: "Google 登入成功",
        data: { ...user, status: "ACTIVE" },
      });
    }

    const username = `${googleUser.displayName}_${googleUser.uid.slice(-6)}`;
    const customerId = buildCustomerId("GOOGLE");

    await db.query(
      "INSERT INTO [user] (username, email, password_hash, membership_level, is_verified, status, customer_id, created_at, last_login) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?, GETDATE(), GETDATE())",
      [username, googleUser.email, `GOOGLE:${googleUser.uid}`, customerId]
    );

    const [createdUsers] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status, customer_id FROM [user] WHERE email = ? LIMIT 1",
      [googleUser.email]
    );

    return res.status(201).json({
      success: true,
      message: "Google 註冊並登入成功",
      data: createdUsers[0],
    });
  } catch (error) {
    console.error("Google login error:", error);
    const isConfigurationError = error.message === "Firebase backend settings are missing";

    return res.status(isConfigurationError ? 500 : 401).json({
      success: false,
      message: isConfigurationError ? "Google 登入尚未完成後端設定" : "Google 登入驗證失敗",
      error: error.message,
    });
  }
});

const getLineFrontendUrl = (requestedUrl) => {
  const publicFrontendUrl = "https://maipianaishield-d61c7.web.app";
  const configuredUrl = process.env.FRONTEND_URL || publicFrontendUrl;

  try {
    const requested = new URL(String(requestedUrl || configuredUrl));
    const configured = new URL(configuredUrl);
    const publicFrontend = new URL(publicFrontendUrl);
    const isPrivateDevelopmentHost =
      requested.hostname === "localhost" ||
      requested.hostname === "127.0.0.1" ||
      requested.hostname.startsWith("192.168.") ||
      requested.hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(requested.hostname);

    if (
      requested.origin === configured.origin ||
      requested.origin === publicFrontend.origin ||
      isPrivateDevelopmentHost
    ) {
      return requested.origin;
    }
  } catch (error) {
    console.warn("Invalid LINE frontend URL:", error.message);
  }

  return configuredUrl;
};

const getLineRedirectUri = (req) => {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = req.get("host");

  if (host && host.endsWith(".onrender.com")) {
    return `${protocol}://${host}/api/auth/line-login/callback`;
  }

  return (
    process.env.LINE_REDIRECT_URI ||
    `${protocol}://${host}/api/auth/line-login/callback`
  );
};

const createLineState = (frontendUrl, redirectUri) => {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const payload = Buffer.from(
    JSON.stringify({
      frontendUrl,
      redirectUri,
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

const readLineState = (state) => {
  const [payload, signature] = String(state || "").split(".");

  if (!payload || !signature || !process.env.LINE_CHANNEL_SECRET) {
    throw new Error("Invalid LINE state");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.LINE_CHANNEL_SECRET)
    .update(payload)
    .digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid LINE state signature");
  }

  const stateData = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

  if (!stateData.issuedAt || Date.now() - stateData.issuedAt > 10 * 60 * 1000) {
    throw new Error("LINE login request expired");
  }

  return stateData;
};

const buildLineFrontendRedirect = (frontendUrl, status, message, extraParams = {}) => {
  const target = new URL("/line-callback", getLineFrontendUrl(frontendUrl));
  target.searchParams.set("status", status);

  if (message) {
    target.searchParams.set("message", message);
  }

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, String(value));
    }
  });

  return target.toString();
};

const createLineLoginTicket = (user) => {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.user_id,
      issuedAt: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

const readLineLoginTicket = (ticket) => {
  const [payload, signature] = String(ticket || "").split(".");
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!payload || !signature || !secret) {
    throw new Error("Invalid LINE login ticket");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid LINE login ticket signature");
  }

  const ticketData = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

  if (!ticketData.issuedAt || Date.now() - ticketData.issuedAt > 5 * 60 * 1000) {
    throw new Error("LINE login ticket expired");
  }

  return ticketData;
};

// LINE 第三方登入起點
router.get("/line-login", (req, res) => {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const redirectUri = getLineRedirectUri(req);

  if (!channelId || !channelSecret) {
    return res.status(500).json({
      success: false,
      message: "LINE login settings are missing",
    });
  }

  const frontendUrl = getLineFrontendUrl(req.query.frontendUrl);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state: createLineState(frontendUrl, redirectUri),
    scope: "profile openid",
  });

  res.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`);
});

router.post("/line-login/complete", async (req, res) => {
  let ticketData;

  try {
    ticketData = readLineLoginTicket(req.body.ticket);
  } catch (error) {
    return res.status(401).json({ success: false, message: "LINE 登入憑證無效或已過期" });
  }

  try {
    const [users] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status, customer_id FROM [user] WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1",
      [ticketData.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "找不到 LINE 登入使用者" });
    }

    return res.json({ success: true, message: "LINE 登入成功", data: users[0] });
  } catch (error) {
    console.error("LINE login completion error:", error);
    return res.status(500).json({ success: false, message: "LINE 登入驗證失敗" });
  }
});

const handleLineCallback = async (req, res) => {
  let frontendUrl = process.env.FRONTEND_URL || "https://maipianaishield-d61c7.web.app";

  try {
    const stateData = readLineState(req.query.state);
    frontendUrl = stateData.frontendUrl || frontendUrl;

    if (req.query.error) {
      return res.redirect(
        buildLineFrontendRedirect(
          frontendUrl,
          "failed",
          String(req.query.error_description || req.query.error)
        )
      );
    }

    const code = String(req.query.code || "");

    if (!code) {
      throw new Error("Missing LINE authorization code");
    }

    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: stateData.redirectUri || getLineRedirectUri(req),
      client_id: process.env.LINE_CHANNEL_ID || "",
      client_secret: process.env.LINE_CHANNEL_SECRET || "",
    });
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        tokenData.error_description || tokenData.error || "Failed to get LINE token"
      );
    }

    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.userId) {
      throw new Error("Failed to get LINE profile");
    }

    const lineUserId = String(profile.userId);
    const displayName = String(profile.displayName || "LINE User").trim();
    const lineEmail = `line_${lineUserId}@line.local`;
    const [existingRows] = await db.query(
      "SELECT user_id FROM [user] WHERE email = ? LIMIT 1",
      [lineEmail]
    );

    if (existingRows.length > 0) {
      await db.query(
        "UPDATE [user] SET last_login = GETDATE(), status = 'ACTIVE' WHERE user_id = ?",
        [existingRows[0].user_id]
      );
    } else {
      const username = `${displayName}_${lineUserId.slice(-6)}`;

      try {
        await db.query(
          "INSERT INTO [user] (username, email, password_hash, membership_level, is_verified, status, customer_id, created_at, last_login) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?, GETDATE(), GETDATE())",
          [username, lineEmail, `LINE:${lineUserId}`, buildCustomerId("LINE")]
        );
      } catch (fullInsertError) {
        console.log("LINE full insert failed, retry minimal:", fullInsertError.message);
        await db.query(
          "INSERT INTO [user] (username, email, password_hash, status) VALUES (?, ?, ?, 'ACTIVE')",
          [username, lineEmail, lineUserId]
        );
      }
    }

    const [lineUsers] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status, customer_id FROM [user] WHERE email = ? LIMIT 1",
      [lineEmail]
    );

    if (lineUsers.length === 0) {
      throw new Error("LINE user synchronization failed");
    }

    const ticket = createLineLoginTicket(lineUsers[0]);

    return res.redirect(
      buildLineFrontendRedirect(frontendUrl, "success", "LINE login successful", { ticket })
    );
  } catch (error) {
    console.error("LINE callback error:", error);

    return res.redirect(
      buildLineFrontendRedirect(frontendUrl, "failed", error.message || "LINE login failed")
    );
  }
};

router.get("/line-login/callback", handleLineCallback);
router.get("/line/callback", handleLineCallback);

module.exports = router;
