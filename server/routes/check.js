// check.js
const express = require("express");
const router = express.Router();
const pool = require("./db");

// 號碼/安全檢測邏輯
router.post("/check-phone", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: "請輸入電話號碼" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM fraud_database WHERE fraud_value = ? LIMIT 1",
      [String(phone).trim()]
    );

    if (rows.length > 0) {
      const fraudData = rows[0];
      return res.json({
        success: true,
        isScam: true,
        status: "scam",
        level: "high",
        score: Number(fraudData.score) || 88,
        message: fraudData.description || "注意！此號碼有疑似詐騙紀錄。",
      });
    }

    return res.json({
      success: true,
      isScam: false,
      status: "safe",
      level: "low",
      score: 15,
      message: "安全！目前資料庫中無此號碼紀錄。",
    });
  } catch (error) {
    console.error("Failed to check phone:", error);
    res.status(500).json({ success: false, message: "伺服器檢測出錯" });
  }
});

// 使用者黑名單/LINE ID 通報 API
router.post("/report-line", async (req, res) => {
  const { lineId, reason } = req.body;
  if (!lineId) {
    return res.status(400).json({ success: false, message: "請輸入 LINE ID" });
  }

  try {
    const now = new Date();
    // 寫入通報資料庫紀錄
    await pool.query(
      "INSERT INTO blacklist (line_id, reason, type, status, created_at) VALUES (?, ?, 'LINE_REPORT', 'PENDING', ?)",
      [lineId, reason || "使用者通報", now]
    );

    return res.json({ success: true, message: "通報成功", lineId });
  } catch (error) {
    console.error("Failed to report LINE ID:", error);
    return res.status(500).json({ success: false, message: "通報寫入失敗" });
  }
});

module.exports = router;