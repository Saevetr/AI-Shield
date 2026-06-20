// index.js
const express = require("express");
const cors = require("cors");
const multer = require("multer"); 
const path = require("path");     
const fs = require("fs");         
require("dotenv").config();

// 💡 引入各功能模組的路由模組
const authRoutes = require("./routes/auth");
const checkRoutes = require("./routes/check");
const homeRoutes = require("./routes/home");
const { analyzeScamAPI } = require("./scam-ai-core"); // 引入 Gemini 核心函式

const app = express();

// 1. 全域中間件配置
app.use(cors());
app.use(express.json());

// 2. 初始化 Multer 多模態檔案暫存夾
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: "uploads/" });

// 3. 根路由測試
app.get("/", (req, res) => {
  res.send("AI Shield Server Running Successfully!");
});

const healthResponse = (req, res) => {
  const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "local";

  res.json({
    success: true,
    service: "ai-shield-backend",
    status: "ok",
    commit,
    deployedAt: process.env.RENDER_DEPLOYMENT_ID || "unknown",
  });
};

app.get("/api/health", healthResponse);
app.get("/api/version", healthResponse);

// 4. 💡 完美對接與分類掛載外部路由 (完全不重疊)
app.use("/api/auth", authRoutes);   // 所有登入驗證路由 -> 變成 /api/auth/login 等
app.use("/api/check", checkRoutes); // 所有安全性檢測路由 -> 變成 /api/check/check-phone 等
app.use("/api/info", homeRoutes);   // 所有首頁與知識庫數據 -> 變成 /api/info/anti-fraud-knowledge 等

// 相容已部署的舊版前端與第三方 OAuth callback。
app.use("/api", authRoutes);
app.use("/api", checkRoutes);

// 5. 多模態 AI 防詐分析核心路由 (搭配 Multer 解析器)
app.post(
  "/api/analyze-scam",
  upload.fields([
    { name: "scamImage", maxCount: 1 },
    { name: "scamAudio", maxCount: 1 }
  ]),
  analyzeScamAPI 
);

// 6. 啟動 Node.js 伺服器
const PORT = process.env.PORT || 3000;
app.use("/api/home", homeRoutes);
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` 🛡️  AI Shield 安全防護網後端伺服器已成功啟動`);
  console.log(` 🌐 運行網址: http://localhost:${PORT}`);
  console.log(`=================================================`);
});


