const express = require("express");
const router = express.Router();
const pool = require("./db");

const getRows = async (sql) => {
  const result = await pool.query(sql);

  if (Array.isArray(result)) {
    if (Array.isArray(result[0])) {
      return result[0];
    }

    if (result[0]?.recordset) {
      return result[0].recordset;
    }
  }

  if (result?.recordset) {
    return result.recordset;
  }

  return [];
};

const safeCount = async (sql, label) => {
  try {
    const rows = await getRows(sql);
    return Number(rows?.[0]?.count || rows?.[0]?.COUNT || 0);
  } catch (error) {
    console.log(`[home stats] ${label} failed:`, error.message);
    return 0;
  }
};

const homeStatsHandler = async (req, res) => {
  const fraudDatabaseCount = await safeCount(
    "SELECT COUNT(*) AS count FROM fraud_database",
    "fraud_database"
  );

  const blacklistCount = await safeCount(
    "SELECT COUNT(*) AS count FROM blacklist",
    "blacklist"
  );

  const reportCount = await safeCount(
    "SELECT COUNT(*) AS count FROM report",
    "report"
  );

  res.json({
    success: true,
    data: {
      fraudDatabaseCount,
      blacklistCount,
      reportCount,
      totalScam: fraudDatabaseCount,
      todayReport: 0,
    },
    fraudDatabaseCount,
    blacklistCount,
    reportCount,
    totalScam: fraudDatabaseCount,
    todayReport: 0,
  });
};

router.get("/summary", homeStatsHandler);
router.get("/home/stats", homeStatsHandler);

router.get("/anti-fraud-knowledge", async (req, res) => {
  try {
    const rows = await getRows(
      "SELECT knowledge_id, title, content, category, source, view_count, created_at FROM anti_fraud_knowledge ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.log("[anti-fraud-knowledge] failed:", error.message);

    res.json({
      success: true,
      data: [],
    });
  }
});

module.exports = router;
