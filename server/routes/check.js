const express = require("express");
const router = express.Router();

const { poolPromise, mssql } = require("../index");

async function handlePhoneCheckLogic(req, res) {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "請輸入電話號碼",
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("phone", mssql.NVarChar, String(phone).trim())
      .query(`
        SELECT *
        FROM [dbo].[fraud_database]
        WHERE [fraud_value] = @phone
      `);

    if (result.recordset.length > 0) {
      const fraudData = result.recordset[0];

      return res.json({
        success: true,

        isScam: true,
        status: "scam",
        level: "high",
        score: Number(fraudData.score) || 88,

        isFraud: true,
        exists: true,

        phone: String(phone).trim(),
        carrier: fraudData.carrier || "未知電信",
        message: fraudData.description || "注意！此號碼有疑似詐騙紀錄。",

        data: {
          isScam: true,
          carrier: fraudData.carrier || "未知電信",
          score: Number(fraudData.score) || 88,
          message: fraudData.description || "注意！此號碼有疑似詐騙紀錄。",
        },

        detail: {
          isScam: true,
          carrier: fraudData.carrier || "未知電信",
          score: Number(fraudData.score) || 88,
          message: fraudData.description || "注意！此號碼有疑似詐騙紀錄。",
          type: fraudData.fraud_type,
        },
      });
    }

    return res.json({
      success: true,

      isScam: false,
      status: "safe",
      level: "low",
      score: 15,

      isFraud: false,
      exists: false,

      phone: String(phone).trim(),
      carrier: "未知電信",
      message: "安全！目前資料庫中無此號碼紀錄。",

      data: {
        isScam: false,
        carrier: "未知電信",
        score: 15,
        message: "安全！目前資料庫中無此號碼紀錄。",
      },

      detail: {
        isScam: false,
        carrier: "未知電信",
        score: 15,
        message: "安全！目前資料庫中無此號碼紀錄。",
      },
    });
  } catch (error) {
    console.error("電話查詢失敗:", error);

    return res.status(500).json({
      success: false,
      message: "伺服器內部錯誤",
      error: error.message,
    });
  }
}

router.post("/phone-check", handlePhoneCheckLogic);
router.post("/phone-query", handlePhoneCheckLogic);
router.post("/check-phone", handlePhoneCheckLogic);

module.exports = router;