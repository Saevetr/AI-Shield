const { normalizeDomain } = require("./cleaner");

const SOURCE_CODE = "MOI_165_DNS_BLOCKLIST";

function mapGovernmentRecord(record) {
  const domain = normalizeDomain(record.fraud_value);

  if (!domain) {
    throw new Error("無效的政府公告網域");
  }

  const month = String(
    record.announcement_month || ""
  );

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("無效的公告年月");
  }

  const description = [
    "資料來源：內政部警政署165反詐騙諮詢專線",
    "資料集：遭停止解析涉詐網站",
    `網站性質：${record.category || "未分類"}`,
    `公告年月：${month}`,
    `法律依據：${record.legal_basis || "未提供"}`,
    `聲請單位：${record.applicant || "未提供"}`,
    "備註：曾列入政府涉詐網站公告，不代表目前仍在運作。"
  ].join("\n");

  return {
    fraud_type: "URL",
    fraud_value: domain,
    description,
    reported_count: 0,
    source: SOURCE_CODE,
    is_confirmed: false,
    blockable: false
  };
}

module.exports = {
  SOURCE_CODE,
  mapGovernmentRecord
};
