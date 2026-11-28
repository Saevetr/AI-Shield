const sql = require("mssql");

const { SOURCE_CODE } = require("./mapper");

const {
  validateInsertRows,
  createBulkTable
} = require("./writer");

const {
  validateUpdateRows,
  createUpdateBulkTable
} = require("./updateWriter");

const BATCH_SIZE = 1000;
const MAX_PILOT_ROWS = 100;

function validateProductionPlan(plan) {
  if (
    !plan ||
    !Array.isArray(plan.inserts) ||
    !Array.isArray(plan.updates)
  ) {
    throw new Error("正式匯入規劃格式錯誤");
  }

  if (plan.inserts.length) {
    validateInsertRows(plan.inserts);
  }

  if (plan.updates.length) {
    validateUpdateRows(plan.updates);
  }

  const domains = new Set(
    plan.inserts.map(row => row.fraud_value)
  );

  for (const row of plan.updates) {
    if (domains.has(row.fraud_value)) {
      throw new Error("新增與更新網域重複");
    }
  }

  return plan.inserts.length + plan.updates.length;
}

function createPilotPlan(plan) {
  validateProductionPlan(plan);

  const updates = plan.updates.slice(
    0, MAX_PILOT_ROWS
  );

  const remaining =
    MAX_PILOT_ROWS - updates.length;

  const inserts = plan.inserts.slice(
    0, remaining
  );

  return {
    inserts,
    updates
  };
}

async function stageInserts(transaction, rows) {
  if (!Array.isArray(rows)) {
    throw new Error("新增資料格式錯誤");
  }

  if (!rows.length) return 0;

  validateInsertRows(rows);

  await new sql.Request(transaction).batch(`
    CREATE TABLE #FraudSyncStage (
      fraud_value VARCHAR(253)
        COLLATE DATABASE_DEFAULT
        NOT NULL PRIMARY KEY,
      description NVARCHAR(MAX) NOT NULL
    );
  `);

  for (
    let i = 0;
    i < rows.length;
    i += BATCH_SIZE
  ) {
    const batch = rows.slice(
      i, i + BATCH_SIZE
    );

    await new sql.Request(transaction).bulk(
      createBulkTable(batch)
    );
  }

  const result =
    await new sql.Request(transaction).query(`
      SELECT COUNT(*) AS staged_count
      FROM #FraudSyncStage;
    `);

  const count =
    result.recordset[0].staged_count;

  if (count !== rows.length) {
    throw new Error("新增暫存資料筆數不一致");
  }

  return count;
}

async function stageUpdates(transaction, rows) {
  if (!Array.isArray(rows)) {
    throw new Error("更新資料格式錯誤");
  }

  if (!rows.length) return 0;

  validateUpdateRows(rows);

  await new sql.Request(transaction).batch(`
    CREATE TABLE #FraudSyncUpdate (
      fraud_id INT NOT NULL PRIMARY KEY,
      fraud_value VARCHAR(253)
        COLLATE DATABASE_DEFAULT
        NOT NULL UNIQUE,
      previous_description NVARCHAR(MAX) NOT NULL,
      description NVARCHAR(MAX) NOT NULL
    );
  `);

  for (
    let i = 0;
    i < rows.length;
    i += BATCH_SIZE
  ) {
    const batch = rows.slice(
      i, i + BATCH_SIZE
    );

    await new sql.Request(transaction).bulk(
      createUpdateBulkTable(batch)
    );
  }

  const result =
    await new sql.Request(transaction).query(`
      SELECT COUNT(*) AS staged_count
      FROM #FraudSyncUpdate;
    `);

  const count =
    result.recordset[0].staged_count;

  if (count !== rows.length) {
    throw new Error("更新暫存資料筆數不一致");
  }

  return count;
}

async function insertStagedRows(
  transaction,
  expectedCount
) {
  if (expectedCount === 0) return 0;

  const request = new sql.Request(transaction);

  request.input(
    "source",
    sql.VarChar(255),
    SOURCE_CODE
  );

  const result = await request.query(`
    INSERT INTO dbo.fraud_database (
      fraud_type,
      fraud_value,
      description,
      reported_count,
      update_at,
      source,
      is_confirmed,
      blockable,
      created_at
    )
    SELECT
      'URL',
      s.fraud_value,
      s.description,
      0,
      GETDATE(),
      @source,
      0,
      0,
      GETDATE()
    FROM #FraudSyncStage AS s
    WHERE NOT EXISTS (
      SELECT 1
      FROM dbo.fraud_database AS f
        WITH (UPDLOCK, HOLDLOCK)
      WHERE UPPER(f.fraud_type) = 'URL'
        AND LOWER(LTRIM(RTRIM(f.fraud_value)))
            = s.fraud_value
    );

    SELECT @@ROWCOUNT AS inserted_count;
  `);

  const inserted =
    result.recordset[0]?.inserted_count;

  if (inserted !== expectedCount) {
    throw new Error(
      "正式新增筆數不一致，必須取消交易"
    );
  }

  return inserted;
}

async function updateStagedRows(
  transaction,
  expectedCount
) {
  if (expectedCount === 0) return 0;

  const request = new sql.Request(transaction);

  request.input(
    "source",
    sql.VarChar(255),
    SOURCE_CODE
  );

  const result = await request.query(`
    UPDATE f
    SET
      f.description = s.description,
      f.update_at = GETDATE()
    FROM dbo.fraud_database AS f
    INNER JOIN #FraudSyncUpdate AS s
      ON f.fraud_id = s.fraud_id
    WHERE CONVERT(VARBINARY(MAX), f.source)
          = CONVERT(VARBINARY(MAX), @source)
      AND UPPER(f.fraud_type) = 'URL'
      AND LOWER(LTRIM(RTRIM(f.fraud_value)))
          = s.fraud_value
      AND CONVERT(VARBINARY(MAX), f.description)
          = CONVERT(VARBINARY(MAX), s.previous_description);

    SELECT @@ROWCOUNT AS updated_count;
  `);

  const updated =
    result.recordset[0]?.updated_count;

  if (updated !== expectedCount) {
    throw new Error(
      "正式更新筆數不一致，必須取消交易"
    );
  }

  return updated;
}

async function executeProductionPlan(
  transaction,
  plan,
  mode
) {
  if (process.env.FRAUD_SYNC_WRITE_ENABLED !== "true") {
    throw new Error("正式資料庫寫入尚未授權");
  }

  if (!["pilot", "sync"].includes(mode)) {
    throw new Error("不支援的正式寫入模式");
  }

  const total = validateProductionPlan(plan);

  if (
    mode === "pilot" &&
    total > MAX_PILOT_ROWS
  ) {
    throw new Error("pilot 不得超過100筆");
  }

  if (total === 0) {
    return {
      inserted: 0,
      updated: 0,
      deleted: 0
    };
  }

  const stagedInserts = await stageInserts(
    transaction,
    plan.inserts
  );

  const stagedUpdates = await stageUpdates(
    transaction,
    plan.updates
  );

  const inserted = await insertStagedRows(
    transaction,
    stagedInserts
  );

  const updated = await updateStagedRows(
    transaction,
    stagedUpdates
  );

  if (
    inserted !== plan.inserts.length ||
    updated !== plan.updates.length
  ) {
    throw new Error("正式寫入結果與規劃不一致");
  }

  return {
    inserted,
    updated,
    deleted: 0
  };
}

module.exports = {
  BATCH_SIZE,
  MAX_PILOT_ROWS,
  validateProductionPlan,
  createPilotPlan,
  stageInserts,
  stageUpdates,
  executeProductionPlan
};
