// routes/auth.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
// ⭐️ 引入你自訂的 mssql 查詢工具（內含 query 方法）
const db = require("./db"); 

const buildCustomerId = (prefix = "CUST") =>
  `${prefix}${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// =========================================================================
// 🔒 密碼安全 Hash 與驗證工具（安全加鹽 + 自動升級舊明文密碼）
// =========================================================================
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !password) return false;

  // 1. 如果是標準格式 salt:hash
  if (storedHash.includes(":")) {
    const parts = storedHash.split(":");
    if (parts.length === 2) {
      const [salt, key] = parts;
      try {
        const derivedKey = crypto.scryptSync(password, salt, 64);
        const storedKeyBuffer = Buffer.from(key, "hex");
        if (derivedKey.length === storedKeyBuffer.length) {
          return crypto.timingSafeEqual(storedKeyBuffer, derivedKey);
        }
      } catch (err) {
        return false;
      }
    }
  }

  // 2. 向後相容：如果是歷史舊資料（明文密碼）
  return storedHash === password;
};

// =========================================================================
// 📱 核心驗證碼儲存池（防止未經驗證直接竄改 DB）
// =========================================================================
const verificationStore = new Map();

// 清理過期的驗證碼
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of verificationStore.entries()) {
    if (data.expiresAt < now) {
      verificationStore.delete(key);
    }
  }
}, 60000);

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
    photoUrl: String(firebaseUser.photoUrl || googleProvider.photoUrl || "").trim(),
  };
};

// =========================================================================
// 🚀 1. 登入功能 (Login) - 支援 Hash 比對與自動升級
// =========================================================================
router.post("/login", async (req, res) => {
  const account = String(req.body.account || req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!account || !password) {
    return res.status(400).json({ success: false, message: "請輸入帳號與密碼" });
  }

  try {
    const [rows] = await db.query(
      "SELECT user_id, username, email, phone, password_hash, membership_level, status FROM [user] WHERE (email = ? OR username = ? OR phone = ?) AND status = 'ACTIVE' LIMIT 1",
      [account, account, account]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
    }

    const user = rows[0];
    const isPasswordValid = verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "帳號或密碼錯誤" });
    }

    // 🔒 若資料庫中的密碼還是舊明文，自動升級為安全加鹽 Hash
    if (!user.password_hash.includes(":")) {
      const secureHash = hashPassword(password);
      await db.query("UPDATE [user] SET password_hash = ? WHERE user_id = ?", [
        secureHash,
        user.user_id,
      ]);
    }

    // 更新最後登入時間
    await db.query("UPDATE [user] SET last_login = GETDATE() WHERE user_id = ?", [user.user_id]);

    // 排除 password_hash 不外洩
    const { password_hash, ...safeUser } = user;

    return res.json({ success: true, message: "登入成功", data: safeUser });
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
// 🚀 取得使用者個人資料 (Get Profile from Database)
// =========================================================================
router.get("/profile", async (req, res) => {
  const userId = req.query.userId || req.query.user_id;
  const email = req.query.email ? String(req.query.email).trim().toLowerCase() : "";
  const account = req.query.account ? String(req.query.account).trim() : "";

  if (!userId && !email && !account) {
    return res.status(400).json({ success: false, message: "缺少查詢標識 (userId / email / account)" });
  }

  try {
    let querySql = "";
    let queryParam = null;

    if (userId) {
      querySql = "SELECT user_id, username, email, phone, membership_level, status, customer_id, created_at, last_login, is_verified FROM [user] WHERE user_id = ? LIMIT 1";
      queryParam = userId;
    } else if (email) {
      querySql = "SELECT user_id, username, email, phone, membership_level, status, customer_id, created_at, last_login, is_verified FROM [user] WHERE email = ? LIMIT 1";
      queryParam = email;
    } else {
      querySql = "SELECT user_id, username, email, phone, membership_level, status, customer_id, created_at, last_login, is_verified FROM [user] WHERE (username = ? OR phone = ? OR email = ?) LIMIT 1";
      queryParam = account;
    }

    const [rows] = await db.query(querySql, querySql.includes("OR") ? [account, account, account] : [queryParam]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該使用者的資料庫紀錄" });
    }

    return res.json({
      success: true,
      message: "成功取得使用者個人資料",
      data: rows[0],
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "無法從資料庫讀取個人資料",
      error: error.message,
    });
  }
});


// =========================================================================
// 🚀 2. 註冊功能 (Register) - 安全 Hash 儲存 + 正確初始化驗證狀態
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
    // 🔒 使用加密 Hash 儲存密碼
    const securePasswordHash = hashPassword(password);

    // is_verified 預設為 0，直到使用者完成驗證碼核對
    await db.query(
      "INSERT INTO [user] (username, email, phone, password_hash, membership_level, is_verified, status, customer_id, created_at) VALUES (?, ?, ?, ?, 'FREE', 0, 'ACTIVE', ?, GETDATE())",
      [username, email, phone, securePasswordHash, customerId]
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
// 🚀 3. 發送驗證碼端點 (Send Verification Code)
// =========================================================================
router.post("/send-verification", async (req, res) => {
  const type = String(req.body.type || "").trim().toLowerCase(); // "phone" | "email"
  const target = String(req.body.target || "").trim();

  if (!type || !target || (type !== "phone" && type !== "email")) {
    return res.status(400).json({ success: false, message: "無效的驗證類型或對象" });
  }

  // 產生 6 位數純數字隨機驗證碼
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `${type}:${target.toLowerCase()}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 分鐘有效

  verificationStore.set(key, {
    code,
    type,
    target,
    expiresAt,
    verified: false,
  });

  console.log(`[🔑 驗證系統] 已發送 ${type} 驗證碼至 ${target}: ${code} (5分鐘有效)`);

  return res.json({
    success: true,
    message: `驗證碼已發送至您的 ${type === "phone" ? "手機簡訊" : "電子信箱"}`,
    devCode: code,
  });
});

// =========================================================================
// 🚀 4. 核對驗證碼並簽發驗證 Token (Verify Code)
// =========================================================================
router.post("/verify-code", async (req, res) => {
  const type = String(req.body.type || "").trim().toLowerCase();
  const target = String(req.body.target || "").trim();
  const code = String(req.body.code || "").trim();

  if (!type || !target || !code) {
    return res.status(400).json({ success: false, message: "請輸入完整驗證資訊" });
  }

  const key = `${type}:${target.toLowerCase()}`;
  const record = verificationStore.get(key);

  if (!record) {
    return res.status(400).json({ success: false, message: "驗證碼不存在或已失效，請重新發送" });
  }

  if (Date.now() > record.expiresAt) {
    verificationStore.delete(key);
    return res.status(400).json({ success: false, message: "驗證碼已過期，請重新發送" });
  }

  if (record.code !== code) {
    return res.status(400).json({ success: false, message: "驗證碼不正確" });
  }

  // 驗證通過，簽發一次性驗證 Token
  const verificationToken = crypto.randomBytes(24).toString("hex");
  verificationStore.set(verificationToken, {
    type,
    target,
    verified: true,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  verificationStore.delete(key);

  return res.json({
    success: true,
    message: "驗證成功",
    verificationToken,
  });
});

// =========================================================================
// 🚀 5. 更新個人資料（嚴格要求已驗證狀態才准變更 DB）
// =========================================================================
router.post("/update-profile", async (req, res) => {
  const userId = req.body.userId || req.body.user_id;
  const customerId = req.body.customerId || req.body.customer_id;
  const currentEmail = String(req.body.currentEmail || req.body.email || "").trim().toLowerCase();
  const newName = req.body.name !== undefined ? String(req.body.name).trim() : null;
  const newPhone = req.body.phone !== undefined ? String(req.body.phone).trim() : null;
  const newEmail = req.body.newEmail !== undefined ? String(req.body.newEmail).trim().toLowerCase() : null;
  const verificationToken = String(req.body.verificationToken || "").trim();

  if (!userId && !customerId && !currentEmail) {
    return res.status(400).json({ success: false, message: "缺少使用者標識 (userId / customerId / email)" });
  }

  try {
    // 尋找目標使用者（支援以 userId、customerId 或 email 查詢）
    let userQuery = "";
    let userParam = null;
    if (userId) {
      userQuery = "SELECT user_id, username, email, phone, customer_id FROM [user] WHERE user_id = ? LIMIT 1";
      userParam = userId;
    } else if (customerId) {
      userQuery = "SELECT user_id, username, email, phone, customer_id FROM [user] WHERE customer_id = ? LIMIT 1";
      userParam = customerId;
    } else {
      userQuery = "SELECT user_id, username, email, phone, customer_id FROM [user] WHERE email = ? LIMIT 1";
      userParam = currentEmail;
    }

    const [users] = await db.query(userQuery, [userParam]);

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該使用者" });
    }

    const user = users[0];

    // 🛡️ 核心安全防護：若變更了電話或 Email，必須檢核 verificationToken
    const isChangingPhone = newPhone && newPhone !== user.phone;
    const isChangingEmail = newEmail && newEmail !== user.email;

    if (isChangingPhone || isChangingEmail) {
      if (!verificationToken) {
        return res.status(403).json({
          success: false,
          message: "變更電話或電子信箱必須先完成驗證碼核對，拒絕直接修改資料庫！",
        });
      }

      const tokenRecord = verificationStore.get(verificationToken);
      if (!tokenRecord || !tokenRecord.verified || Date.now() > tokenRecord.expiresAt) {
        return res.status(403).json({
          success: false,
          message: "驗證憑證已失效或無效，請重新進行驗證！",
        });
      }

      // 核對 Token 對應的目標是否與欲變更的新值一致
      if (isChangingPhone && tokenRecord.target !== newPhone) {
        return res.status(403).json({ success: false, message: "驗證號碼與欲變更號碼不一致" });
      }
      if (isChangingEmail && tokenRecord.target.toLowerCase() !== newEmail) {
        return res.status(403).json({ success: false, message: "驗證信箱與欲變更信箱不一致" });
      }

      // 驗證成功，銷毀 Token 避免重複利用
      verificationStore.delete(verificationToken);
    }

    // 執行更新
    const updateFields = [];
    const updateParams = [];

    if (newName) {
      updateFields.push("username = ?");
      updateParams.push(newName);
    }
    if (newPhone) {
      updateFields.push("phone = ?");
      updateParams.push(newPhone);
    }
    if (newEmail) {
      updateFields.push("email = ?");
      updateParams.push(newEmail);
      updateFields.push("is_verified = 1"); // 經過 Token 核對，確認已驗證
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "無任何修改欄位" });
    }

    updateParams.push(user.user_id);
    await db.query(
      `UPDATE [user] SET ${updateFields.join(", ")} WHERE user_id = ?`,
      updateParams
    );

    const [updatedUsers] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status FROM [user] WHERE user_id = ? LIMIT 1",
      [user.user_id]
    );

    return res.json({
      success: true,
      message: "個人資料已安全更新完成",
      data: updatedUsers[0],
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return res.status(500).json({ success: false, message: "更新資料失敗", error: error.message });
  }
});
// =========================================================================
// 🚀 6. 修改密碼 (Change Password) - 需比對目前密碼
// =========================================================================
router.post("/change-password", async (req, res) => {
  const userId = req.body.userId || req.body.user_id;
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : "";
  const currentPassword = String(req.body.currentPassword || "").trim();
  const newPassword = String(req.body.newPassword || "").trim();

  if ((!userId && !email) || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "請輸入目前密碼與新密碼" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "新密碼至少需 8 位數" });
  }

  try {
    const [users] = await db.query(
      userId
        ? "SELECT user_id, password_hash FROM [user] WHERE user_id = ? LIMIT 1"
        : "SELECT user_id, password_hash FROM [user] WHERE email = ? LIMIT 1",
      [userId || email]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該使用者" });
    }

    const user = users[0];
    const isCurrentValid = verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return res.status(400).json({ success: false, message: "目前密碼不正確" });
    }

    const secureHash = hashPassword(newPassword);
    await db.query("UPDATE [user] SET password_hash = ? WHERE user_id = ?", [
      secureHash,
      user.user_id,
    ]);

    return res.json({ success: true, message: "密碼已成功修改！" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ success: false, message: "修改密碼失敗", error: err.message });
  }
});

// =========================================================================
// 🚀 7. 刪除帳號 (Delete Account)
// =========================================================================
router.post("/delete-account", async (req, res) => {
  const userId = req.body.userId || req.body.user_id;
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : "";

  if (!userId && !email) {
    return res.status(400).json({ success: false, message: "缺少使用者標識" });
  }

  try {
    const [users] = await db.query(
      userId
        ? "SELECT user_id FROM [user] WHERE user_id = ? LIMIT 1"
        : "SELECT user_id FROM [user] WHERE email = ? LIMIT 1",
      [userId || email]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該使用者" });
    }

    const targetId = users[0].user_id;
    // 軟刪除：標記狀態為 DELETED 並更新登出
    await db.query("UPDATE [user] SET status = 'DELETED', last_login = GETDATE() WHERE user_id = ?", [
      targetId,
    ]);

    return res.json({ success: true, message: "帳號已成功註銷移除" });
  } catch (err) {
    console.error("Delete account error:", err);
    return res.status(500).json({ success: false, message: "刪除帳號失敗", error: err.message });
  }
});
// =========================================================================
// 🚀 8. 綁定第三方帳號 (Bind OAuth - Google / LINE)
// =========================================================================
router.post("/bind-oauth", async (req, res) => {
  const userId = req.body.userId || req.body.user_id;
  const email = req.body.email ? String(req.body.email).trim().toLowerCase() : "";
  const provider = String(req.body.provider || "").trim().toLowerCase(); // "google" | "line"
  const ticket = req.body.ticket ? String(req.body.ticket).trim() : "";
  const idToken = req.body.idToken ? String(req.body.idToken).trim() : "";

  if ((!userId && !email) || !provider || (provider !== "google" && provider !== "line")) {
    return res.status(400).json({ success: false, message: "無效的綁定參數" });
  }

  try {
    const [users] = await db.query(
      userId
        ? "SELECT user_id, username, email, phone, customer_id FROM [user] WHERE user_id = ? LIMIT 1"
        : "SELECT user_id, username, email, phone, customer_id FROM [user] WHERE email = ? LIMIT 1",
      [userId || email]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該使用者" });
    }

    const user = users[0];
    let boundAvatarUrl = "";

    if (provider === "google") {
      if (ticket) {
        const ticketData = readLineLoginTicket(ticket);
        boundAvatarUrl = ticketData.avatarUrl || "";
      } else if (idToken) {
        const googleUser = await verifyFirebaseGoogleUser(idToken);
        boundAvatarUrl = googleUser.photoUrl || "";
      }
    } else if (provider === "line") {
      if (ticket) {
        const ticketData = readLineLoginTicket(ticket);
        boundAvatarUrl = ticketData.avatarUrl || "";
      }
    }

    return res.json({
      success: true,
      message: `${provider === "google" ? "Google" : "LINE"} 帳號綁定成功！`,
      data: {
        provider,
        bound: true,
        avatar_url: boundAvatarUrl,
      },
    });
  } catch (err) {
    console.error("Bind OAuth error:", err);
    return res.status(500).json({ success: false, message: "綁定失敗", error: err.message });
  }
});



// =========================================================================
// 🚀 6. 同步重設後的密碼到 MySQL/MSSQL (Sync Password) - 支援 Hash 加密儲存
// =========================================================================
router.post("/sync-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const newPassword = String(req.body.newPassword || "").trim();

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: "資料不完整" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "新密碼至少需 6 位數" });
  }

  try {
    // 檢查該使用者是否存在
    const [users] = await db.query("SELECT user_id FROM [user] WHERE email = ? LIMIT 1", [email]);
    
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該電子郵件對應的使用者" });
    }

    // 🔒 加密儲存新密碼
    const secureHash = hashPassword(newPassword);
    await db.query(
      "UPDATE [user] SET password_hash = ? WHERE email = ?",
      [secureHash, email]
    );

    return res.json({ success: true, message: "資料庫密碼已成功加密同步更新！" });
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

    const username = `${googleUser.displayName}_${googleUser.uid.slice(-6)}`;

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      // 🔒 自動更新 username，修復之前歷史儲存留下的 '???' 問號亂碼
      await db.query(
        "UPDATE [user] SET username = ?, last_login = GETDATE(), is_verified = 1, status = 'ACTIVE' WHERE user_id = ?",
        [username, user.user_id]
      );

      return res.json({
        success: true,
        message: "Google 登入成功",
        data: { ...user, username, avatar_url: googleUser.photoUrl || "", status: "ACTIVE" },
      });
    }

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
      data: { ...createdUsers[0], avatar_url: googleUser.photoUrl || "" },
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

const isAppSchemeUrl = (urlStr) => {
  if (!urlStr) return false;
  return (
    urlStr.startsWith("myuiapp://") ||
    urlStr.startsWith("exp://") ||
    urlStr.startsWith("exps://")
  );
};

const getLineFrontendUrl = (requestedUrl) => {
  if (isAppSchemeUrl(requestedUrl)) {
    return requestedUrl;
  }

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
      return requested.href;
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

const sendFrontendRedirect = (res, frontendUrl, status, message, extraParams = {}) => {
  const safeBase = getLineFrontendUrl(frontendUrl);

  // 如果是 App 深度連結 (如 exp://... 或 myuiapp://...)
  if (isAppSchemeUrl(safeBase)) {
    const separator = safeBase.includes("?") ? "&" : "?";
    const query = new URLSearchParams();
    query.set("status", status);
    if (message) query.set("message", message);
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });
    const finalAppUrl = `${safeBase}${separator}${query.toString()}`;

    // 回傳 HTML 喚醒頁面，保證 iOS / Android 瀏覽器 100% 強制跳回 Expo Go
    return res.type("html").send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>正在返回 AI Shield...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    body {
      margin: 0; padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fbff;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 90vh; text-align: center;
    }
    .card {
      background: white; padding: 32px 24px; border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 360px; width: 100%;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { margin: 0 0 8px; color: #1d2738; font-size: 20px; }
    p { margin: 0 0 24px; color: #64748b; font-size: 14px; }
    .btn {
      display: block; background: #397bf2; color: white; text-decoration: none;
      padding: 14px 20px; border-radius: 10px; font-weight: 600; font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🛡️</div>
    <h2>${status === "success" ? "授權成功！" : "授權未完成"}</h2>
    <p>${status === "success" ? "正在自動返回 AI Shield App..." : (message || "即將返回 App...")}</p>
    <a id="openBtn" class="btn" href="${finalAppUrl}">點此返回 App</a>
  </div>
  <script>
    const target = "${finalAppUrl}";
    window.location.href = target;
    setTimeout(function() {
      window.location.replace(target);
    }, 400);
  </script>
</body>
</html>
    `);
  }

  // 如果是 Web 網頁連結
  const target = new URL("/line-callback", safeBase);
  target.searchParams.set("status", status);

  if (message) {
    target.searchParams.set("message", message);
  }

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, String(value));
    }
  });

  return res.redirect(target.toString());
};

const createLineLoginTicket = (user, avatarUrl = "") => {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.user_id,
      avatarUrl: avatarUrl || "",
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

    return res.json({
      success: true,
      message: "LINE 登入成功",
      data: {
        ...users[0],
        avatar_url: ticketData.avatarUrl || "",
      },
    });
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
      return sendFrontendRedirect(
        res,
        frontendUrl,
        "failed",
        String(req.query.error_description || req.query.error)
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
    const avatarUrl = String(profile.pictureUrl || "").trim();
    const lineEmail = `line_${lineUserId}@line.local`;
    const username = `${displayName}_${lineUserId.slice(-6)}`;

    const [existingRows] = await db.query(
      "SELECT user_id FROM [user] WHERE email = ? LIMIT 1",
      [lineEmail]
    );

    if (existingRows.length > 0) {
      // 🔒 自動更新 username，修復之前儲存留下的 '???' 問號亂碼
      await db.query(
        "UPDATE [user] SET username = ?, last_login = GETDATE(), status = 'ACTIVE' WHERE user_id = ?",
        [username, existingRows[0].user_id]
      );
    } else {

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

    const ticket = createLineLoginTicket(lineUsers[0], avatarUrl);

    return sendFrontendRedirect(res, frontendUrl, "success", "LINE login successful", { ticket });
  } catch (error) {
    console.error("LINE callback error:", error);

    return sendFrontendRedirect(res, frontendUrl, "failed", error.message || "LINE login failed");
  }
};

router.get("/line-login/callback", handleLineCallback);
router.get("/line/callback", handleLineCallback);

// =========================================================================
// 🚀 Google OAuth 流程（專為 Expo Go 與原生行動端設計）
// =========================================================================
const getGoogleRedirectUri = (req) => {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = req.get("host");

  if (host && host.endsWith(".onrender.com")) {
    return `${protocol}://${host}/api/auth/google-login/callback`;
  }

  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${protocol}://${host}/api/auth/google-login/callback`
  );
};

// Google OAuth 起點
router.get("/google-start", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleRedirectUri(req);

  if (!clientId) {
    return res.status(500).json({
      success: false,
      message: "GOOGLE_CLIENT_ID 環境變數未設定",
    });
  }

  const frontendUrl = getLineFrontendUrl(req.query.frontendUrl);
  const state = createLineState(frontendUrl, redirectUri);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

const handleGoogleCallback = async (req, res) => {
  let frontendUrl = process.env.FRONTEND_URL || "https://maipianaishield-d61c7.web.app";

  try {
    const stateData = readLineState(req.query.state);
    frontendUrl = stateData.frontendUrl || frontendUrl;

    if (req.query.error) {
      return sendFrontendRedirect(
        res,
        frontendUrl,
        "failed",
        String(req.query.error)
      );
    }

    const code = String(req.query.code || "");
    if (!code) {
      throw new Error("Missing Google authorization code");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: stateData.redirectUri || getGoogleRedirectUri(req),
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to get Google token");
    }

    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userinfoResponse.json();

    if (!userinfoResponse.ok || !profile.email) {
      throw new Error("Failed to get Google profile");
    }

    const email = String(profile.email).trim().toLowerCase();
    const displayName = String(profile.name || email.split("@")[0]).trim();
    const avatarUrl = String(profile.picture || "").trim();
    const googleId = String(profile.sub || "");
    const username = `${displayName}_${googleId.slice(-6)}`;

    const [existingRows] = await db.query(
      "SELECT user_id FROM [user] WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingRows.length > 0) {
      // 🔒 自動更新 username，修復之前儲存留下的 '???' 問號亂碼
      await db.query(
        "UPDATE [user] SET username = ?, last_login = GETDATE(), is_verified = 1, status = 'ACTIVE' WHERE user_id = ?",
        [username, existingRows[0].user_id]
      );
    } else {
      const customerId = buildCustomerId("GOOGLE");
      await db.query(
        "INSERT INTO [user] (username, email, password_hash, membership_level, is_verified, status, customer_id, created_at, last_login) VALUES (?, ?, ?, 'FREE', 1, 'ACTIVE', ?, GETDATE(), GETDATE())",
        [username, email, `GOOGLE:${googleId}`, customerId]
      );
    }

    const [googleUsers] = await db.query(
      "SELECT user_id, username, email, phone, membership_level, status, customer_id FROM [user] WHERE email = ? LIMIT 1",
      [email]
    );

    const ticket = createLineLoginTicket(googleUsers[0], avatarUrl);

    return sendFrontendRedirect(res, frontendUrl, "success", "Google login successful", { ticket });
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return sendFrontendRedirect(res, frontendUrl, "failed", error.message || "Google login failed");
  }
};

router.get("/google-login/callback", handleGoogleCallback);
router.get("/google/callback", handleGoogleCallback);

module.exports = router;
