const express = require("../../server/node_modules/express");

const {
  getCallerList
} = require("../services/callerListService");

const app = express();

const PORT = 3001;

// 確認伺服器是否正常運作
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Shield 來電辨識 API 運作中"
  });
});

// 取得來電辨識清單
app.get("/api/caller-id/list", async (req, res) => {
  try {
    const list = await getCallerList();

    res.json({
      success: true,
      total: list.length,
      updatedAt: new Date().toISOString(),
      data: list
    });

  } catch (error) {
    console.error("電話清單讀取失敗：", error.message);

    res.status(500).json({
      success: false,
      message: "電話清單讀取失敗"
    });
  }
});

// 暫時只允許本機測試
app.listen(PORT, "0.0.0.0", () => {
  console.log("AI Shield 來電辨識伺服器已啟動");
  console.log(`http://127.0.0.1:${PORT}`);
  console.log(`http://127.0.0.1:${PORT}/api/caller-id/list`);
});