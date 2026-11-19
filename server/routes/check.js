const express = require("express");
const router = express.Router();
const db = require("./db");

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeLineId = (value) => String(value || "").trim();
const getMemberId = (input) => {
  const value = input?.userId ?? input?.user_id;
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (!/^\d+$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
};

const normalizeTargetType = (value) =>
  ["LINE", "LINE ID", "LINE_ID"].includes(String(value).toUpperCase()) ? "LINE" : "PHONE";

// Read old mixed records without deleting them or treating reports as blocks.
const getLegacyReport = (row) => {
  const note = String(row.note || "");
  const prefix = ["REPORT: ", "使用者通報："].find((item) => note.startsWith(item));
  if (!prefix) return null;
  const separator = "\n原備註：";
  const offset = note.indexOf(separator);
  return {
    reason: note.slice(prefix.length, offset < 0 ? undefined : offset),
    originalNote: offset < 0 ? null : note.slice(offset + separator.length),
  };
};

const isBlacklistRecord = (row) => {
  const legacy = getLegacyReport(row);
  return !legacy || legacy.originalNote !== null;
};

const displayBlacklistNote = (row) =>
  getLegacyReport(row)?.originalNote ?? String(row.note || "").replace(/^BLOCK: /, "");

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
    (blacklistRows[0] && displayBlacklistNote(blacklistRows[0])) ||
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
    const userId = getMemberId(req.body) || getMemberId(req.query);
    const [blacklistRows] = userId ? await db.query(
      `SELECT blacklist_id, blacklist_type, blacklist_value, note, created_at
       FROM blacklist
       WHERE user_id = ? AND UPPER(blacklist_type) = 'PHONE'
         AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(blacklist_value, '-', ''), ' ', ''), '(', ''), ')', ''), '+', '') = ?
       ORDER BY created_at DESC`,
      [userId, phone]
    ) : [[]];

    return res.json(
      buildRiskResponse({ type: "PHONE", value: phone, fraudRows, blacklistRows: blacklistRows.filter(isBlacklistRecord) })
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
       WHERE UPPER(fraud_type) IN ('LINE', 'LINE_ID')
         AND LOWER(LTRIM(RTRIM(fraud_value))) = LOWER(?)
       ORDER BY is_confirmed DESC, reported_count DESC`,
      [lineId]
    );
    const userId = getMemberId(req.body) || getMemberId(req.query);
    const [blacklistRows] = userId ? await db.query(
      `SELECT blacklist_id, blacklist_type, blacklist_value, note, created_at
       FROM blacklist
       WHERE user_id = ? AND UPPER(blacklist_type) IN ('LINE', 'LINE_ID')
         AND LOWER(LTRIM(RTRIM(blacklist_value))) = LOWER(?)
       ORDER BY created_at DESC`,
      [userId, lineId]
    ) : [[]];

    return res.json(
      buildRiskResponse({ type: "LINE", value: lineId, fraudRows, blacklistRows: blacklistRows.filter(isBlacklistRecord) })
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
  const type = ["LINE", "LINE_ID"].includes(storedType) ? "LINE ID" : "電話";

  return {
    id: Number(row.blacklist_id),
    type,
    value,
    note: displayBlacklistNote(row),
    created_at: row.created_at,
  };
};

router.get("/blacklist", async (req, res) => {
  try {
    const userId = getMemberId(req.query);
    if (!userId) {
      return res.status(401).json({ success: false, message: "請重新登入後查看個人黑名單" });
    }
    const [rows] = await db.query(
      `SELECT blacklist_id, blacklist_type, blacklist_value, note, created_at
       FROM blacklist WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    const requestedType = String(req.query.type || "");
    const items = rows
      .filter(isBlacklistRecord)
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
  const userId = getMemberId(req.body);
  const value = String(req.body.value || req.body.lineId || "").trim();
  const requestedType = String(req.body.type || (req.body.lineId ? "LINE ID" : ""));
  const blacklistType = requestedType === "電話" ? "PHONE" : normalizeTargetType(requestedType);
  const note = String(req.body.note || req.body.reason || "使用者自行加入").trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: "請重新登入後再加入黑名單" });
  }
  if (!value) {
    return res.status(400).json({ success: false, message: "請輸入黑名單內容" });
  }

  try {
    const [existingRows] = await db.query(
      `SELECT blacklist_id, blacklist_value, blacklist_type, note, created_at
       FROM blacklist WHERE LOWER(LTRIM(RTRIM(blacklist_value))) = LOWER(?)
         AND user_id = ? AND UPPER(blacklist_type) IN (?, ?)`,
      [value, userId, blacklistType, blacklistType === "LINE" ? "LINE_ID" : "PHONE"]
    );

    if (existingRows.some(isBlacklistRecord)) {
      return res.status(409).json({ success: false, message: "此資料已在您的黑名單中" });
    }

    const [createdRows] = await db.query(
        `INSERT INTO blacklist (user_id, blacklist_type, blacklist_value, note, created_at)
         OUTPUT INSERTED.blacklist_id, INSERTED.blacklist_type,
           INSERTED.blacklist_value, INSERTED.note, INSERTED.created_at
         VALUES (?, ?, ?, ?, GETDATE())`,
        [userId, blacklistType, value, `BLOCK: ${note}`]
      );
    if (!createdRows[0]) throw new Error("Blacklist write returned no saved record");

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
  const userId = getMemberId(req.query) || getMemberId(req.body);

  if (!userId) {
    return res.status(401).json({ success: false, message: "請重新登入後管理個人黑名單" });
  }

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "無效的黑名單編號" });
  }

  try {
    const [rows] = await db.query(
      `SELECT blacklist_id, blacklist_value, blacklist_type, note, created_at
       FROM blacklist WHERE blacklist_id = ? AND user_id = ?`,
      [id, userId]
    );
    const legacy = rows[0] && getLegacyReport(rows[0]);
    // Removing an old mixed block must not erase its report history.
    if (legacy) {
      await db.query(
        "UPDATE blacklist SET note = ? WHERE blacklist_id = ? AND user_id = ?",
        [`REPORT: ${legacy.reason}`, id, userId]
      );
      return res.json({ success: true, message: "已移除黑名單，通報紀錄仍保留" });
    }
    const deleteSql = "DELETE FROM blacklist OUTPUT DELETED.blacklist_id WHERE blacklist_id = ? AND user_id = ?";
    const deleteParams = [id, userId];

    const [deletedRows] = await db.query(deleteSql, deleteParams);

    if (deletedRows.length === 0) {
      return res.status(404).json({ success: false, message: "找不到該筆黑名單資料或無刪除權限" });
    }

    return res.json({ success: true, message: "已移除黑名單" });
  } catch (error) {
    console.error("Failed to delete blacklist item:", error);
    return res.status(500).json({ success: false, message: "黑名單刪除失敗" });
  }
});

const mapReport = (row) => {
  let content = null;
  try {
    const parsed = JSON.parse(row.report_content);
    if (parsed?.version === 1 && typeof parsed.target === "string") content = parsed;
  } catch {
    // Older reports contain plain text and can identify a target via fraud_id.
  }
  return {
    id: row.report_id,
    target: content?.target || row.fraud_value || "未提供查詢對象",
    type: normalizeTargetType(content?.type || row.fraud_type),
    reason: content?.reason || row.report_content || "使用者通報",
    created_at: row.created_at,
    status: "審核中",
    risk: null,
  };
};

const readReports = async (userId) => {
  const [rows] = await db.query(
    `SELECT r.report_id, r.report_content, r.created_at, f.fraud_type, f.fraud_value
     FROM [report] r LEFT JOIN fraud_database f ON f.fraud_id = r.fraud_id
     WHERE r.user_id = ? ORDER BY r.created_at DESC, r.report_id DESC`,
    [userId]
  );
  return rows.map(mapReport);
};

const readLegacyReports = async (userId) => {
  const [rows] = await db.query(
    `SELECT blacklist_id, blacklist_value, blacklist_type, note, created_at
     FROM blacklist WHERE user_id = ?
       AND (LEFT(note, 8) = ? OR LEFT(note, 6) = ?)
     ORDER BY created_at DESC, blacklist_id DESC`,
    [userId, "REPORT: ", "使用者通報："]
  );
  return rows.filter((row) => getLegacyReport(row)).map((row) => ({
    id: `legacy-${row.blacklist_id}`,
    target: row.blacklist_value,
    type: normalizeTargetType(row.blacklist_type),
    reason: getLegacyReport(row).reason,
    created_at: row.created_at,
    status: "審核中",
    risk: null,
  }));
};

const reportKey = (type, value) => `${type}:${type === "PHONE"
  ? normalizePhone(value) : normalizeLineId(value).toLowerCase()}`;

router.get("/reports", async (req, res) => {
  const userId = getMemberId(req.query);

  if (!userId) {
    return res.status(401).json({ success: false, message: "請重新登入後查看個人通報紀錄" });
  }

  try {
    const reports = await readReports(userId);
    const legacy = await readLegacyReports(userId);
    const keys = new Set(reports.map((report) => reportKey(report.type, report.target)));
    const combined = [...reports, ...legacy.filter((report) => !keys.has(reportKey(report.type, report.target)))];
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ success: true, data: combined });
  } catch (error) {
    console.error("Failed to load personal reports:", error);
    return res.status(500).json({ success: false, message: "讀取個人通報紀錄失敗" });
  }
});

const handleReport = async (req, res, forcedType) => {
  const userId = getMemberId(req.body);
  const rawType = String(forcedType || req.body?.type || "PHONE").toUpperCase();
  const type = normalizeTargetType(rawType);
  const inputValue = String(req.body?.value || req.body?.target || req.body?.lineId || req.body?.phone || "").trim();
  const value = type === "PHONE" ? normalizePhone(inputValue) : inputValue;
  const reason = String(req.body?.reason || "使用者主動通報可疑詐騙").trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: "請重新登入後再送出通報" });
  }

  if (!value || value.length < 3) {
    return res.status(400).json({ success: false, message: "請輸入有效的通報號碼或帳號" });
  }

  try {
    const reports = await readReports(userId);
    const existing = reports.find((report) => reportKey(report.type, report.target) === reportKey(type, value));
    if (existing) {
      return res.json({ success: true, duplicate: true, message: "此項目已在你的通報紀錄中", data: existing });
    }

    // Store a structured payload in the existing report_content column.
    const content = JSON.stringify({ version: 1, type, target: value, reason })
      .replace(/[\u007f-\uffff]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);
    const [savedRows] = await db.query(
      `INSERT INTO [report] (user_id, fraud_id, report_content, created_at)
       OUTPUT INSERTED.report_id, INSERTED.report_content, INSERTED.created_at
       VALUES (?, NULL, ?, GETDATE())`,
      [userId, content]
    );

    if (!savedRows[0]) throw new Error("Report write returned no saved record");
    return res.json({ success: true, message: "通報已儲存，等待審核", data: mapReport(savedRows[0]) });
  } catch (error) {
    console.error("Failed to submit report:", error);
    return res.status(500).json({ success: false, message: "通報寫入失敗" });
  }
};

router.post("/report", (req, res) => handleReport(req, res));
router.post("/report-line", (req, res) => handleReport(req, res, "LINE"));

module.exports = router;
