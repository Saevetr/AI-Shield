const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const path = require("path");
const fs = require("fs");
const { analyzeScamAPI } = require('./scam-ai-core');
require("dotenv").config();

const app = express();

// 基礎全域 Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// 🛠️ Multer 檔案上傳儲存設定 (確保處理多模態檔案)
// ==========================================
const multer = require("multer");

// 確保專案目錄下一定有 uploads 暫存資料夾，沒有就自動建立
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 設定儲存引擎：保留檔案原本的名稱與時間戳記，方便 debug
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 儲存檔名例如：1718512345678-ticket_scam.png
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// ==========================================
// 🗄️ MySQL 全域連線池設定 (供底層或需要的地方備用)
// ==========================================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test_db",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==========================================
// 🚀 核心路由分流區 (保持你們修改好的 Express Router 機制)
// ==========================================

// 健康檢查
app.get("/", (req, res) => {
  res.send("AI Shield Server Running!");
});

// 1. 帳號、登入、三方 OAuth 相關路由 (/api/login, /api/register 等)
app.use("/api", require("./routes/auth"));

// 2. 數據庫與首頁看板相關路由 (/api/blacklist, /api/home/* 等)
app.use("/api", require("./routes/home"));

// 3. 基本檢測機制路由 (/api/check-phone, /api/check-line, /api/analyze-message)
app.use("/api", require("./routes/check"));

// 4. 最新升級的 Gemini 多模態語音/截圖防詐分析核心 (整合上面宣告的 upload)
app.post(
  "/api/analyze-scam",
  upload.fields([
    { name: "scamImage", maxCount: 1 }, // 接收前端傳來的詐騙截圖
    { name: "scamAudio", maxCount: 1 }  // 接收前端傳來的錄音檔
  ]),
  analyzeScamAPI
);

// ==========================================
// 🏁 啟動 Node.js 伺服器
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Shield Server Running: http://localhost:${PORT}`);
});