
const path = require("path");
const crypto = require("crypto");

require("../../server/node_modules/dotenv").config({
  path: path.join(__dirname, "../../server/.env")
});

const express = require("../../server/node_modules/express");

const {
  getCallerList
} = require("../services/callerListService");

const app = express();

const PORT = Number(process.env.PORT || 3001);

const API_KEY = process.env.CALLER_ID_API_KEY;

if (!API_KEY || API_KEY.length < 32) {
  console.error("缺少有效的 CALLER_ID_API_KEY");
  process.exit(1);
}

app.disable("x-powered-by");

// 驗證 API 存取權限
function verifyAccess(req, res, next) {
  const providedKey = req.get("x-caller-id-key") || "";

  const expected = Buffer.from(API_KEY);
  const provided = Buffer.from(providedKey);

  if (
    expected.length !== provided.length ||
    !crypto.timingSafeEqual(expected, provided)
  ) {
    return res.status(403).json({
      success: false,
      message: "沒有存取權限"
    });
  }

  next();
}

// 避免短時間重複查詢 Azure
let cachedResult = null;
let cachedAt = 0;
let pendingRequest = null;

const CACHE_DURATION = 5 * 60 * 1000;

async function loadCallerList() {
  if (
    cachedResult &&
    Date.now() - cachedAt < CACHE_DURATION
  ) {
    return cachedResult;
  }

  if (!pendingRequest) {
    pendingRequest = (async () => {
      const list = await getCallerList();

      cachedResult = {
        success: true,
        total: list.length,
        updatedAt: new Date().toISOString(),
        data: list
      };

      cachedAt = Date.now();

      return cachedResult;
    })().finally(() => {
      pendingRequest = null;
    });
  }

  return pendingRequest;
}

// 伺服器首頁
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Shield 雲端來電辨識服務"
  });
});

// Render 健康檢查
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "ai-shield-caller-id"
  });
});

// 下載電話辨識名單
app.get(
  "/api/caller-id/list",
  verifyAccess,
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    try {
      const result = await loadCallerList();

      res.json(result);

    } catch (error) {
      console.error("電話名單查詢失敗", {
        name: error.name,
        code: error.code,
        number: error.number,
        originalCode: error.originalError?.code,
        originalNumber: error.originalError?.info?.number
      });

      res.status(500).json({
        success: false,
        message: "電話名單讀取失敗"
      });
    }
  }
);

// 拒絕其他未定義的 API
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "找不到此服務"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `AI Shield Caller ID API 已啟動，Port: ${PORT}`
  );
});
