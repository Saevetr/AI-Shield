const sql = require("mssql");
const { SOURCE_CODE } = require("./mapper");
const { normalizeDomain } = require("./cleaner");

function getMonth(description) {
  const match = String(description || "").match(
    /^公告年月：(\d{4}-(?:0[1-9]|1[0-2]))$/m
  );

  return match ? match[1] : null;
}

function validateUpdateRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("沒有可更新的資料");
  }

  const ids = new Set();
  const domains = new Set();

  for (const row of rows) {
    if (row.source !== SOURCE_CODE) {
      throw new Error("禁止更新其他來源資料");
    }

    if (
      !Number.isSafeInteger(row.fraud_id) ||
      row.fraud_id <= 0 ||
      row.fraud_id > 2147483647
    ) {
      throw new Error("無效的 fraud_id");
    }

    const domain = normalizeDomain(row.fraud_value);

    if (!domain || domain !== row.fraud_value) {
      throw new Error("無效的網域");
    }

    if (
      ids.has(row.fraud_id) ||
      domains.has(domain)
    ) {
      throw new Error("重複的更新目標");
    }

    const oldMonth = getMonth(
      row.previous_description
    );

    const newMonth = getMonth(
      row.description
    );

    if (!oldMonth || !newMonth) {
      throw new Error("缺少有效公告年月");
    }

    if (newMonth < oldMonth) {
      throw new Error("禁止覆蓋較新公告");
    }

    if (
      row.description === row.previous_description
    ) {
      throw new Error("資料沒有異動");
    }

    if (
      !row.description.includes(
        "不代表目前仍在運作"
      )
    ) {
      throw new Error("缺少歷史公告警示");
    }

    ids.add(row.fraud_id);
    domains.add(domain);
  }

  return true;
}

function createUpdateBulkTable(rows) {
  validateUpdateRows(rows);

  const table = new sql.Table("#FraudSyncUpdate");

  table.create = false;

  table.columns.add(
    "fraud_id",
    sql.Int,
    { nullable: false }
  );

  table.columns.add(
    "fraud_value",
    sql.VarChar(253),
    { nullable: false }
  );

  table.columns.add(
    "previous_description",
    sql.NVarChar(sql.MAX),
    { nullable: false }
  );

  table.columns.add(
    "description",
    sql.NVarChar(sql.MAX),
    { nullable: false }
  );

  for (const row of rows) {
    table.rows.add(
      row.fraud_id,
      row.fraud_value,
      row.previous_description,
      row.description
    );
  }

  return table;
}

module.exports = {
  validateUpdateRows,
  createUpdateBulkTable
};
