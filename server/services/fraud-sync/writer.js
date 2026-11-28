const sql = require("mssql");

const { SOURCE_CODE } = require("./mapper");
const { normalizeDomain } = require("./cleaner");

const BATCH_SIZE = 1000;

function validateInsertRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("沒有可匯入的資料");
  }

  const seen = new Set();

  for (const row of rows) {
    if (
      row.source !== SOURCE_CODE ||
      row.fraud_type !== "URL" ||
      row.reported_count !== 0 ||
      row.is_confirmed !== false ||
      row.blockable !== false
    ) {
      throw new Error("資料來源或安全設定不正確");
    }

    const domain = normalizeDomain(row.fraud_value);

    if (!domain || domain !== row.fraud_value) {
      throw new Error("網域格式不正確");
    }

    if (seen.has(domain)) {
      throw new Error("匯入資料包含重複網域");
    }

    if (
      typeof row.description !== "string" ||
      !row.description.includes("公告年月：") ||
      !row.description.includes("不代表目前仍在運作")
    ) {
      throw new Error("缺少政府公告資訊");
    }

    seen.add(domain);
  }

  return true;
}

function createBulkTable(rows) {
  const table = new sql.Table("#FraudSyncStage");

  table.create = false;

  table.columns.add(
    "fraud_value",
    sql.VarChar(253),
    { nullable: false }
  );

  table.columns.add(
    "description",
    sql.NVarChar(sql.MAX),
    { nullable: false }
  );

  for (const row of rows) {
    table.rows.add(
      row.fraud_value,
      row.description
    );
  }

  return table;
}

async function insertGovernmentRows(pool, rows) {
  validateInsertRows(rows);

  // 現階段僅允許小批量回滾測試
  if (rows.length > 100) {
    throw new Error("目前測試上限為100筆");
  }

  const transaction = new sql.Transaction(pool);

  await transaction.begin(
    sql.ISOLATION_LEVEL.SERIALIZABLE
  );

  let rolledBack = false;

  transaction.on("rollback", () => {
    rolledBack = true;
  });

  try {
    await new sql.Request(transaction).batch(`
      CREATE TABLE #FraudSyncStage (
        fraud_value VARCHAR(253) NOT NULL PRIMARY KEY,
        description NVARCHAR(MAX) NOT NULL
      );
    `);

    const stageCheck = await new sql.Request(
      transaction
    ).query(`
      SELECT OBJECT_ID(
        'tempdb..#FraudSyncStage'
      ) AS stage_id;
    `);

    if (!stageCheck.recordset[0]?.stage_id) {
      throw new Error("暫存表未保留，停止批次寫入");
    }

    console.log("PASS：暫存表存在確認");


    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await new sql.Request(transaction).bulk(
        createBulkTable(batch)
      );
    }

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

    const inserted = result.recordset[0].inserted_count;

    // 目前禁止正式提交，一律回滾
    await transaction.rollback();

    return {
      requested: rows.length,
      insertedDuringTest: inserted,
      skipped: rows.length - inserted,
      committed: 0,
      rolledBack: true
    };

  } catch (error) {
    if (!rolledBack) {
      await transaction.rollback();
    }

    throw error;
  }
}

module.exports = {
  validateInsertRows,
  createBulkTable,
  insertGovernmentRows
};
