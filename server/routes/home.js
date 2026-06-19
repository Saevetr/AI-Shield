// home.js
const express = require("express");
const router = express.Router();
const pool = require("./db");

// 獲取所有防詐知識文章列表
router.get("/anti-fraud-knowledge", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT knowledge_id, title, content, category, source, view_count, created_at FROM anti_fraud_knowledge ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Failed to query knowledge:", error);
    res.status(500).json({ success: false, message: "無法獲取防詐知識庫" });
  }
});

// 首頁看板數據統計
router.get("/home/stats", async (req, res) => {
  try {
    const [totalScam] = await pool.query("SELECT COUNT(*) as count FROM fraud_database");
    const [todayReport] = await pool.query("SELECT COUNT(*) as count FROM blacklist WHERE TO_DAYS(created_at) = TO_DAYS(NOW())");

    res.json({
      success: true,
      data: {
        totalScamRecords: totalScam[0].count || 0,
        todayReports: todayReport[0].count || 0,
        systemStatus: "運行正常"
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "無法獲取首頁統計數據" });
  }
});

module.exports = router;