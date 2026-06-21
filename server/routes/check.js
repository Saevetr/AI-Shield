const express = require("express");
const router = express.Router();
const db = require("./db");

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeLineId = (value) => String(value || "").trim();

const calculateDatabaseScore = (rows) => {
  if (rows.length === 0) {
    return 15;
  }

  const reportedCount = Math.max(
    0,
    ...rows.map((row) => Number(row.reported_count || 0))
  );
  const confirmed = rows.some(
    (row) => row.is_confirmed === true || row.is_confirmed === 1
  );

  return Math.min(99, (confirmed ? 85 : 70) + Math.min(14, reportedCount));
};

const buildRiskResponse = ({ type, value, fraudRows, blacklistRows }) => {
  const matches = [...fraudRows, ...blacklistRows];
  const isScam = matches.length > 0;
  const score = calculateDatabaseScore(matches);
  const description =
    fraudRows[0]?.description ||
    blacklistRows[0]?.note ||
    (isScam ? "資料庫中找到相關風險紀錄。" : "目前資料庫中沒有相關風險紀錄。");
  const isPhone = type === "PHONE";
  const safeMessage = isPhone
    ? "安全！目前資料庫中無此號碼紀錄。"
    : "安全！目前資料庫中無此 LINE ID 紀錄。";
  const riskMessage = isPhone
    ? "注意！此號碼有疑似詐騙紀錄。"
    : "注意！此 LINE ID 有疑似詐騙紀錄。";
  const detail = {
    isScam,
    level: isScam ? "high" : "low",
    score,
    status: isScam ? (isPhone ? "scam" : "危險帳號") : "safe",
    message: isScam ? riskMessage : safeMessage,
    reason: isScam ? description : "",
    carrier: isPhone ? "未知電信" : undefined,
    lineId: isPhone ? undefined : value,
  };

  return {
    success: true,
    source: isScam ? "database_found" : "database_not_found",
    isScam,
    phone: isPhone ? value : undefined,
    lineId: isPhone ? undefined : value,
    ...detail,
    data: detail,
    detail,
    matches,
  };
};

const handlePhoneCheck = async (req, res) => {
  const phone = normalizePhone(req.body?.phone || req.query.phone);

  if (phone.length < 6) {
    return res.status(400).json({ success: false, message: "請輸入有效電話號碼" });
  }

  try {
    const [fraudRows] = await db.query(
      `SELECT TOP (10) fraud_id, fraud_type, fraud_value, description,
        reported_count, source, is_confirmed, created_at
       FROM fraud_database
       WHERE UPPER(fraud_type) = 'PHONE'
         AND (
           REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(fraud_value, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') = ?
           OR RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(fraud_value, '-', ''), ' ', ''), '(', ''), ')', ''), '+', ''), 9) = RIGHT(?, 9)
         )
       ORDER BY is_confirmed DESC, reported_count DESC`,
      [phone, phone]
    );
    const [blacklistRows] = await db.query(
      `SELECT TOP (10) blacklist_id, blacklist_type, blacklist_value, note, created_at
       FROM blacklist
       WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(blacklist_value, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') = ?
       ORDER BY created_at DESC`,
      [phone]
    );

    return res.json(
      buildRiskResponse({ type: "PHONE", value: phone, fraudRows, blacklistRows })
    );
  } catch (error) {
    console.error("Failed to check phone:", error);
    return res.status(500).json({
      success: false,
      message: "電話資料查詢失敗",
      error: error.message,
    });
  }
};

router.get("/check-phone", handlePhoneCheck);
router.post("/check-phone", handlePhoneCheck);

const handleLineCheck = async (req, res) => {
  const lineId = normalizeLineId(req.body?.lineId || req.query.lineId);

  if (lineId.length < 3) {
    return res.status(400).json({ success: false, message: "請輸入有效 LINE ID" });
  }

  try {
    const [fraudRows] = await db.query(
      `SELECT TOP (10) fraud_id, fraud_type, fraud_value, description,
        reported_count, source, is_confirmed, created_at
       FROM fraud_database
       WHERE UPPER(fraud_type) = 'LINE'
         AND LOWER(LTRIM(RTRIM(fraud_value))) = LOWER(?)
       ORDER BY is_confirmed DESC, reported_count DESC`,
      [lineId]
    );
    const [blacklistRows] = await db.query(
      `SELECT TOP (10) blacklist_id, blacklist_type, blacklist_value, note, created_at
       FROM blacklist
       WHERE LOWER(LTRIM(RTRIM(blacklist_value))) = LOWER(?)
       ORDER BY created_at DESC`,
      [lineId]
    );

    return res.json(
      buildRiskResponse({ type: "LINE", value: lineId, fraudRows, blacklistRows })
    );
  } catch (error) {
    console.error("Failed to check LINE ID:", error);
    return res.status(500).json({
      success: false,
      message: "LINE ID 查詢失敗",
      error: error.message,
    });
  }
};

router.get("/check-line", handleLineCheck);
router.post("/check-line", handleLineCheck);

router.post("/analyze-message", async (req, res) => {
  const messageText = String(req.body.message || req.body.text || "").trim();

  if (messageText.length < 2) {
    return res.status(400).json({ success: false, message: "請輸入要分析的訊息" });
  }

  try {
    const [keywordRows] = await db.query(
      `SELECT TOP (30) keyword_id, keyword, risk_score, category
       FROM keyword
       WHERE keyword IS NOT NULL
         AND LEN(LTRIM(RTRIM(keyword))) >= 2
         AND CHARINDEX(LOWER(keyword), LOWER(?)) > 0
       ORDER BY risk_score DESC`,
      [messageText]
    );
    const [urlRows] = await db.query(
      `SELECT TOP (20) fraud_id, fraud_value, description, reported_count,
        source, is_confirmed
       FROM fraud_database
       WHERE UPPER(fraud_type) = 'URL'
         AND fraud_value IS NOT NULL
         AND LEN(LTRIM(RTRIM(fraud_value))) >= 4
         AND CHARINDEX(LOWER(LTRIM(RTRIM(fraud_value))), LOWER(?)) > 0
       ORDER BY is_confirmed DESC, reported_count DESC`,
      [messageText]
    );
    const heuristicGroups = [
      {
        label: "獲利承諾",
        terms: ["賺錢", "獲利", "保證獲利", "高報酬", "穩賺", "翻倍", "零風險"],
      },
      {
        label: "投資邀請",
        terms: ["投資", "股票", "虛擬貨幣", "加密貨幣", "帶單", "投資群組", "老師報牌"],
      },
      {
        label: "付款要求",
        terms: ["匯款", "轉帳", "入金", "儲值", "安全帳戶", "操作ATM", "解除分期"],
      },
      {
        label: "帳號或連結要求",
        terms: ["點擊連結", "加入LINE", "提供驗證碼", "提供密碼", "下載APP", "開啟網銀"],
      },
    ];
    const matchedGroups = heuristicGroups
      .map((group) => ({
        ...group,
        matches: group.terms.filter((term) => messageText.includes(term)),
      }))
      .filter((group) => group.matches.length > 0);
    const heuristicMatches = [
      ...new Set(matchedGroups.flatMap((group) => group.matches)),
    ];
    const keywordScore = Math.max(0, ...keywordRows.map((row) => Number(row.risk_score || 0)));
    const urlScore = urlRows.length > 0 ? calculateDatabaseScore(urlRows) : 0;
    const hasExplicitHighRiskPhrase = [
      "保證獲利",
      "穩賺不賠",
      "匯款到安全帳戶",
      "提供驗證碼",
    ].some((term) => messageText.includes(term));
    const heuristicScore = hasExplicitHighRiskPhrase
      ? 85
      : matchedGroups.length >= 2
      ? Math.min(79, 55 + matchedGroups.length * 10)
      : heuristicMatches.length >= 2
      ? 55
      : heuristicMatches.length === 1
      ? 35
      : 0;
    const score = Math.max(15, keywordScore, urlScore, heuristicScore);
    const level = score >= 80 ? "high" : score >= 50 ? "medium" : "low";
    const isScam = score >= 50;
    const matchedKeywords = [
      ...keywordRows,
      ...urlRows.map((row) => ({
        keyword: row.fraud_value,
        reason: row.description || "命中雲端詐騙網址資料庫",
      })),
      ...heuristicMatches,
    ];
    const reasonParts = [
      urlRows.length > 0 ? "訊息包含雲端資料庫中的高風險網址" : "",
      keywordRows.length > 0 ? "訊息命中風險關鍵字" : "",
      heuristicMatches.length > 0
        ? `命中可疑話術：${matchedGroups
            .map((group) => `${group.label}（${group.matches.join("、")}）`)
            .join("；")}`
        : "",
    ].filter(Boolean);
    const message = isScam
      ? "此訊息包含疑似詐騙內容，請勿點擊連結或依指示匯款。"
      : "目前未發現明顯詐騙內容，仍請留意陌生連結與匯款要求。";
    const detail = {
      isScam,
      level,
      score,
      status: isScam ? "scam" : "safe",
      message,
      reason: reasonParts.join("；"),
      matchedKeywords,
    };

    return res.json({
      success: true,
      source: urlRows.length > 0 ? "database_found" : "analysis_complete",
      ...detail,
      data: detail,
      detail,
    });
  } catch (error) {
    console.error("Failed to analyze message:", error);
    return res.status(500).json({
      success: false,
      message: "訊息分析失敗",
      error: error.message,
    });
  }
});

const mapBlacklistItem = (row) => {
  const value = String(row.blacklist_value || "");
  const storedType = String(row.blacklist_type || "").toUpperCase();
  const type = storedType.includes("PHONE") || /^\+?\d[\d\s()-]+$/.test(value)
    ? "電話"
    : "LINE ID";

  return {
    id: Number(row.blacklist_id),
    type,
    value,
    note: row.note || "",
    created_at: row.created_at,
  };
};

router.get("/blacklist", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT blacklist_id, blacklist_type, blacklist_value, note, created_at FROM blacklist ORDER BY created_at DESC"
    );
    const requestedType = String(req.query.type || "");
    const items = rows
      .map(mapBlacklistItem)
      .filter(
        (item) =>
          item.value.trim().length > 0 &&
          (!requestedType || item.type === requestedType)
      );

    return res.json({ success: true, items, data: items });
  } catch (error) {
    console.error("Failed to load blacklist:", error);
    return res.status(500).json({ success: false, message: "黑名單讀取失敗" });
  }
});

router.post("/blacklist", async (req, res) => {
  const value = String(req.body.value || req.body.lineId || "").trim();
  const requestedType = String(req.body.type || (req.body.lineId ? "LINE ID" : ""));
  const blacklistType = requestedType === "電話" ? "PHONE" : "LINE";
  const note = String(req.body.note || req.body.reason || "使用者自行加入").trim();

  if (!value) {
    return res.status(400).json({ success: false, message: "請輸入黑名單內容" });
  }

  try {
    const [existingRows] = await db.query(
      "SELECT blacklist_id FROM blacklist WHERE LOWER(LTRIM(RTRIM(blacklist_value))) = LOWER(?) LIMIT 1",
      [value]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ success: false, message: "此資料已在黑名單中" });
    }

    const [createdRows] = await db.query(
      `INSERT INTO blacklist (blacklist_type, blacklist_value, note, created_at)
       OUTPUT INSERTED.blacklist_id, INSERTED.blacklist_type,
         INSERTED.blacklist_value, INSERTED.note, INSERTED.created_at
       VALUES (?, ?, ?, GETDATE())`,
      [blacklistType, value, note]
    );

    return res.status(201).json({
      success: true,
      message: "已加入黑名單",
      data: mapBlacklistItem(createdRows[0]),
    });
  } catch (error) {
    console.error("Failed to add blacklist item:", error);
    return res.status(500).json({ success: false, message: "黑名單寫入失敗" });
  }
});

router.delete("/blacklist/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "無效的黑名單編號" });
  }

  try {
    const [deletedRows] = await db.query(
      "DELETE FROM blacklist OUTPUT DELETED.blacklist_id WHERE blacklist_id = ?",
      [id]
    );

    if (deletedRows.length === 0) {
      return res.status(404).json({ success: false, message: "找不到黑名單資料" });
    }

    return res.json({ success: true, message: "已移除黑名單" });
  } catch (error) {
    console.error("Failed to delete blacklist item:", error);
    return res.status(500).json({ success: false, message: "黑名單刪除失敗" });
  }
});

router.post("/report-line", async (req, res) => {
  const lineId = normalizeLineId(req.body.lineId);
  const reason = String(req.body.reason || "使用者主動通報").trim();

  if (lineId.length < 3) {
    return res.status(400).json({ success: false, message: "請輸入有效 LINE ID" });
  }

  try {
    const [existingRows] = await db.query(
      "SELECT blacklist_id FROM blacklist WHERE LOWER(LTRIM(RTRIM(blacklist_value))) = LOWER(?) LIMIT 1",
      [lineId]
    );

    if (existingRows.length === 0) {
      await db.query(
        "INSERT INTO blacklist (blacklist_type, blacklist_value, note, created_at) VALUES ('LINE', ?, ?, GETDATE())",
        [lineId, `使用者通報：${reason}`]
      );
    }

    return res.json({ success: true, message: "通報成功", lineId });
  } catch (error) {
    console.error("Failed to report LINE ID:", error);
    return res.status(500).json({ success: false, message: "通報寫入失敗" });
  }
});

module.exports = router;
