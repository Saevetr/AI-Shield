
function classifyCaller(result) {
  if (!result || result.success !== true) {
    return {
      type: "error",
      title: "暫時無法辨識",
      message: "無法取得電話查詢結果",
      color: "#9E9E9E",
    };
  }

  if (result.isScam === true || result.level === "high") {
    return {
      type: "danger",
      title: "疑似詐騙來電",
      message: result.reason || "請謹慎接聽",
      score: result.score,
      color: "#F44336",
    };
  }

  if (result.level === "medium") {
    return {
      type: "warning",
      title: "可疑來電",
      message: result.reason || "請提高警覺",
      score: result.score,
      color: "#FF9800",
    };
  }

  return {
    type: "unknown",
    title: "未知來電",
    message:
      result.source === "database_not_found"
        ? "目前資料庫查無此號碼紀錄"
        : "目前無法確認來電身分",
    score: result.score,
    color: "#9E9E9E",
  };
}

module.exports = { classifyCaller };
