// routes/home.js
const express = require("express");
const router = express.Router();
const pool = require("./db"); // ⭐️ 確保引入同層的 db

// 1. 獲取所有防詐知識文章
router.get("/anti-fraud-knowledge", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT knowledge_id, title, content, category, source, view_count, created_at FROM anti_fraud_knowledge ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: "無法獲取防詐知識庫", error: error.message });
  }
});

// 2. 首頁看板加總統計
router.get("/home/stats", async (req, res) => {
  try {
    const [totalScam] = await pool.query("SELECT COUNT(*) as count FROM fraud_database");
    const [todayReport] = await pool.query(
      "SELECT COUNT(*) as count FROM blacklist WHERE CAST(created_at AS date) = CAST(GETDATE() AS date)"
    );

    res.json({
      success: true,
      data: {
        totalScamRecords: totalScam[0].count || 0,
        todayReports: todayReport[0].count || 0,
        systemStatus: "全時防護中"
      }
    });
  } catch (error) {
    console.error("Failed to load home stats:", error);
    res.status(500).json({ success: false, message: "無法獲取統計數據" });
  }
});

module.exports = router;
