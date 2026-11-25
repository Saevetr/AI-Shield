
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// 標記為 LINE 專用服務
process.env.LINE_ONLY_MODE = "true";

// 檢查必要環境變數
const requiredEnv = [
    "LINE_CHANNEL_SECRET",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_INTERNAL_API_KEY",
    "GEMINI_API_KEY"
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`缺少必要環境變數：${key}`);
    }
}

const lineWebhookRoutes = require("./routes/lineWebhook");
const checkRoutes = require("./routes/check");
const homeRoutes = require("./routes/home");
const { analyzeScamAPI } = require("./scam-ai-core");

const app = express();

app.disable("x-powered-by");

// LINE Webhook 必須在 JSON 解析之前掛載
app.use("/api/line/webhook", lineWebhookRoutes);

app.use(express.json({ limit: "100kb" }));

// 建立暫存資料夾
const uploadDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    dest: uploadDir,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
        fields: 5,
        fieldSize: 100 * 1024
    }
});

// 內部 API 驗證
function verifyInternalRequest(req, res, next) {
    const received = Buffer.from(
        req.get("x-line-internal-key") || ""
    );

    const expected = Buffer.from(
        process.env.LINE_INTERNAL_API_KEY
    );

    if (
        received.length !== expected.length ||
        !crypto.timingSafeEqual(received, expected)
    ) {
        return res.status(403).json({
            success: false,
            message: "禁止存取"
        });
    }

    next();
}

// 公開健康檢查
app.get("/", (req, res) => {
    res.send("AI Shield LINE Bot Running");
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "ai-shield-line-bot",
        status: "ok"
    });
});

// 僅允許 LINE 所需的查詢 API
const allowedCheckPaths = new Set([
    "/check-phone",
    "/check-line",
    "/analyze-message"
]);

app.use(
    "/api/check",
    verifyInternalRequest,
    (req, res, next) => {
        if (
            req.method !== "POST" ||
            !allowedCheckPaths.has(req.path)
        ) {
            return res.sendStatus(404);
        }

        // 禁止使用 APP 的個人黑名單查詢
        if (req.body) {
            delete req.body.userId;
            delete req.body.user_id;
        }

        next();
    },
    checkRoutes
);

// 保留原本的知識庫查詢相容性
app.use(
    "/api/info",
    verifyInternalRequest,
    (req, res, next) => {
        if (
            req.method !== "GET" ||
            req.path !== "/anti-fraud-knowledge"
        ) {
            return res.sendStatus(404);
        }

        next();
    },
    homeRoutes
);

// AI 多模態分析
app.post(
    "/api/analyze-scam",
    verifyInternalRequest,
    upload.fields([
        { name: "scamImage", maxCount: 1 },
        { name: "scamAudio", maxCount: 1 }
    ]),
    analyzeScamAPI
);

// 其他 API 一律不開放
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "找不到此服務"
    });
});

// 錯誤處理
app.use((err, req, res, next) => {
    console.error("LINE 專用後端請求處理失敗");

    res.status(err.status || (
        err instanceof multer.MulterError ? 400 : 500
    )).json({
        success: false,
        message: "請求處理失敗"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("==================================");
    console.log("🛡️ 麥騙 AI Shield LINE 專用後端");
    console.log(`🌐 Port: ${PORT}`);
    console.log("🔒 內部 API 驗證已啟用");
    console.log("==================================");
});
