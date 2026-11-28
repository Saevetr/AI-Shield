const { normalizeDomain } = require("./cleaner");

const {
  SOURCE_CODE,
  mapGovernmentRecord
} = require("./mapper");

function getAnnouncementMonth(description) {
  const match = String(description || "").match(
    /^公告年月：(\d{4}-(?:0[1-9]|1[0-2]))$/m
  );

  return match ? match[1] : null;
}

function planChanges(governmentRecords, existingRows) {
  const governmentMap = new Map();
  const existingDomains = new Set();

  for (const row of existingRows) {
    const domain = normalizeDomain(row.fraud_value);

    if (!domain) continue;

    if (row.source === SOURCE_CODE) {
      if (governmentMap.has(domain)) {
        throw new Error("資料庫已有重複政府網域");
      }

      governmentMap.set(domain, row);
    } else {
      existingDomains.add(domain);
    }
  }

  const inserts = [];
  const updates = [];

  const stats = {
    total: governmentRecords.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    existingOtherSource: 0,
    olderAnnouncement: 0,
    skipped: 0
  };

  const seen = new Set();

  for (const record of governmentRecords) {
    const mapped = mapGovernmentRecord(record);
    const domain = mapped.fraud_value;

    if (seen.has(domain)) {
      throw new Error("輸入資料尚未完成去重");
    }

    seen.add(domain);

    const existing = governmentMap.get(domain);

    if (existing) {
      const oldMonth = getAnnouncementMonth(
        existing.description
      );

      if (!oldMonth) {
        throw new Error("既有政府資料缺少公告年月");
      }

      if (oldMonth > record.announcement_month) {
        stats.olderAnnouncement++;
        stats.skipped++;
        continue;
      }

      if (existing.description === mapped.description) {
        stats.unchanged++;
        stats.skipped++;
        continue;
      }

      updates.push({
        fraud_id: existing.fraud_id,
        fraud_value: domain,
        source: SOURCE_CODE,
        previous_description: existing.description,
        description: mapped.description
      });

      stats.updated++;
      continue;
    }

    if (existingDomains.has(domain)) {
      stats.existingOtherSource++;
      stats.skipped++;
      continue;
    }

    inserts.push(mapped);
    stats.inserted++;
  }

  return {
    inserts,
    updates,
    stats
  };
}

module.exports = {
  planChanges
};
