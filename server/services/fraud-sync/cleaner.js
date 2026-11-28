const { parse } = require("csv-parse/sync");
const { domainToASCII } = require("node:url");
const { isIP } = require("node:net");
const { SOURCE, fetchFraudData } = require("./fetcher");

const REQUIRED_COLUMNS = [
  "民國年月",
  "網域",
  "網站性質",
  "法律依據",
  "聲請單位"
];

function normalizeDomain(value) {
  let domain = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (!domain || /[\s/:@?#\\%]/.test(domain)) {
    return null;
  }

  domain = domainToASCII(domain);

  if (!domain || domain.length > 253 || isIP(domain)) {
    return null;
  }

  const labels = domain.split(".");

  if (labels.length < 2) {
    return null;
  }

  const valid = labels.every(label =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
  );

  if (!valid || /^\d+$/.test(labels.at(-1))) {
    return null;
  }

  return domain;
}

function normalizeMonth(value) {
  const month = String(value || "").trim();

  if (!/^\d{5}$/.test(month)) {
    return null;
  }

  const year = Number(month.slice(0, 3)) + 1911;
  const monthNumber = Number(month.slice(3));

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  return `${year}-${String(monthNumber).padStart(2, "0")}`;
}

function cleanFraudData(csv) {
  const rows = parse(csv, {
    bom: true,
    columns: headers => {
      const cleaned = headers.map(h => h.trim());

      if (!REQUIRED_COLUMNS.every(h => cleaned.includes(h))) {
        throw new Error("CSV 欄位格式與預期不符");
      }

      return cleaned;
    },
    skip_empty_lines: true,
    trim: true
  });

  if (rows.length === 0) {
    throw new Error("CSV 沒有可處理的資料");
  }

  const uniqueDomains = new Map();

  const stats = {
    total: rows.length,
    invalidDomain: 0,
    invalidMonth: 0,
    duplicates: 0,
    valid: 0,
    unique: 0
  };

  const invalidSamples = [];

  for (const row of rows) {
    const domain = normalizeDomain(row["網域"]);
    const month = normalizeMonth(row["民國年月"]);

    if (!domain) {
      stats.invalidDomain++;

      if (invalidSamples.length < 10) {
        invalidSamples.push({
          reason: "網域格式異常",
          value: row["網域"]
        });
      }

      continue;
    }

    if (!month) {
      stats.invalidMonth++;

      if (invalidSamples.length < 10) {
        invalidSamples.push({
          reason: "年月格式異常",
          value: row["民國年月"]
        });
      }

      continue;
    }

    stats.valid++;

    const record = {
      fraud_type: "URL",
      fraud_value: domain,
      category: row["網站性質"] || "未分類",
      announcement_month: month,
      legal_basis: row["法律依據"] || "",
      applicant: row["聲請單位"] || "",
      source: SOURCE.name
    };

    const existing = uniqueDomains.get(domain);

    if (existing) {
      stats.duplicates++;

      if (month > existing.announcement_month) {
        uniqueDomains.set(domain, record);
      }
    } else {
      uniqueDomains.set(domain, record);
    }
  }

  const records = Array.from(uniqueDomains.values());

  stats.unique = records.length;

  const categories = Object.create(null);
  const months = Object.create(null);

  for (const record of records) {
    categories[record.category] =
      (categories[record.category] || 0) + 1;

    months[record.announcement_month] =
      (months[record.announcement_month] || 0) + 1;
  }

  return {
    records,
    stats,
    categories,
    months,
    invalidSamples
  };
}

if (require.main === module) {
  fetchFraudData()
    .then(csv => {
      console.time("資料清洗耗時");

      const result = cleanFraudData(csv);

      console.timeEnd("資料清洗耗時");

      console.log("\n===== 資料清洗結果 =====");
      console.table(result.stats);

      console.log("\n===== 網站性質統計 =====");
      console.table(result.categories);

      console.log("\n===== 公告年月統計 =====");
      console.table(result.months);

      console.log("\n===== 異常資料範例 =====");
      console.table(result.invalidSamples);

      console.log("\n===== 清洗後資料範例 =====");
      console.log(result.records.slice(0, 3));

      console.log("\n===== 測試完成 =====");
      console.log("尚未連線或修改 Azure 資料庫");
    })
    .catch(error => {
      console.error("資料清洗失敗：", error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  normalizeDomain,
  normalizeMonth,
  cleanFraudData
};
