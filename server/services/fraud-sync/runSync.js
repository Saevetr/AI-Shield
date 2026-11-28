const assert = require("node:assert/strict");

const { fetchFraudData } = require("./fetcher");
const { cleanFraudData } = require("./cleaner");
const { planChanges } = require("./planner");
const { validateSourceData } = require("./sourceGuard");

const {
  connectDatabase,
  getExistingUrls
} = require("./database");

const sql = require("mssql");

const {
  getExistingUrlsInTransaction
} = require("./database");

const {
  acquireImportLock
} = require("./transaction");

const {
  runProductionTransaction
} = require("./productionTransaction");

const {
  createPilotPlan,
  executeProductionPlan
} = require("./productionWriter");

const MODES = ["preview", "pilot", "sync"];

function validateMode(mode) {
  if (!MODES.includes(mode)) {
    throw new Error("不支援的同步模式");
  }

  if (mode !== "preview") {
    throw new Error(
      "正式寫入功能尚未開放，目前僅允許 preview"
    );
  }

  return mode;
}

async function runWriteMode(
  pool,
  cleaned,
  mode
) {
  if (
    process.env.FRAUD_SYNC_WRITE_ENABLED !== "true"
  ) {
    throw new Error("正式資料庫寫入尚未授權");
  }

  if (
    mode === "sync" &&
    process.env.FRAUD_SYNC_FULL_ENABLED !== "true"
  ) {
    throw new Error("完整同步尚未授權");
  }

  if (!["pilot", "sync"].includes(mode)) {
    throw new Error("不支援的正式寫入模式");
  }

  validateSourceData(cleaned);

  const transaction =
    new sql.Transaction(pool);

  let planningSummary;

  const outcome = await runProductionTransaction(
    transaction,
    acquireImportLock,
    async tx => {
      const existingRows =
        await getExistingUrlsInTransaction(tx);

      if (
        !Array.isArray(existingRows) ||
        existingRows.length === 0
      ) {
        throw new Error("Azure 網址資料異常為空");
      }

      const fullPlan = planChanges(
        cleaned.records,
        existingRows
      );

      assert.equal(
        fullPlan.inserts.length,
        fullPlan.stats.inserted
      );

      assert.equal(
        fullPlan.updates.length,
        fullPlan.stats.updated
      );

      assert.equal(
        fullPlan.inserts.length +
        fullPlan.updates.length +
        fullPlan.stats.skipped,
        cleaned.records.length
      );

      const selectedPlan =
        mode === "pilot"
          ? createPilotPlan(fullPlan)
          : fullPlan;

      planningSummary = {
        existingUrls: existingRows.length,
        plannedInserts: fullPlan.inserts.length,
        plannedUpdates: fullPlan.updates.length,
        skipped: fullPlan.stats.skipped,
        selectedInserts: selectedPlan.inserts.length,
        selectedUpdates: selectedPlan.updates.length,
        deferred:
          fullPlan.inserts.length +
          fullPlan.updates.length -
          selectedPlan.inserts.length -
          selectedPlan.updates.length
      };

      const result = await executeProductionPlan(
        tx,
        selectedPlan,
        mode
      );

      assert.equal(
        result.inserted,
        selectedPlan.inserts.length
      );

      assert.equal(
        result.updated,
        selectedPlan.updates.length
      );

      assert.equal(result.deleted, 0);

      return result;
    }
  );

  return {
    ...planningSummary,
    actualInserts: outcome.result.inserted,
    actualUpdates: outcome.result.updated,
    actualDeletes: outcome.result.deleted,
    committed: outcome.committed,
    rolledBack: outcome.rolledBack
  };
}

async function runSync(mode = "preview") {
  validateMode(mode);

  const startedAt = new Date();
  let pool;

  try {
    console.log("===== AI Shield 政府資料同步 =====");
    console.log("執行模式：", mode);
    console.log("開始時間：", startedAt.toISOString());

    const csv = await fetchFraudData();
    const cleaned = cleanFraudData(csv);

    if (
      !Array.isArray(cleaned.records) ||
      cleaned.records.length === 0
    ) {
      throw new Error("政府資料異常為空");
    }

    console.log("\n===== 資料清洗結果 =====");
    console.table(cleaned.stats);

    console.log("\n===== 政府來源安全檢查 =====");

    const sourceCheck = validateSourceData(cleaned);

    console.table(sourceCheck);
    console.log("政府來源安全檢查：PASS");

    pool = await connectDatabase();

    if (mode !== "preview") {
      const written = await runWriteMode(
        pool,
        cleaned,
        mode
      );

      const summary = {
        mode,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        durationSeconds:
          (Date.now() - startedAt.getTime()) / 1000,
        governmentRecords: cleaned.records.length,
        sourceValidationPassed: sourceCheck.passed,
        sourceTotal: sourceCheck.total,
        sourceInvalid: sourceCheck.invalid,
        sourceInvalidRatio: sourceCheck.invalidRatio,
        ...written,
        success: true
      };

      console.log("\n===== 正式同步結果 =====");
      console.table(summary);

      return summary;
    }

    const existingRows = await getExistingUrls(pool);

    if (
      !Array.isArray(existingRows) ||
      existingRows.length === 0
    ) {
      throw new Error("Azure 網址資料異常為空");
    }

    const plan = planChanges(
      cleaned.records,
      existingRows
    );

    assert.equal(
      plan.inserts.length,
      plan.stats.inserted
    );

    assert.equal(
      plan.updates.length,
      plan.stats.updated
    );

    assert.equal(
      plan.inserts.length +
      plan.updates.length +
      plan.stats.skipped,
      cleaned.records.length
    );

    const summary = {
      mode,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      durationSeconds:
        (Date.now() - startedAt.getTime()) / 1000,
      governmentRecords: cleaned.records.length,
      sourceValidationPassed: sourceCheck.passed,
      sourceTotal: sourceCheck.total,
      sourceInvalid: sourceCheck.invalid,
      sourceInvalidRatio: sourceCheck.invalidRatio,
      existingUrls: existingRows.length,
      plannedInserts: plan.inserts.length,
      plannedUpdates: plan.updates.length,
      skipped: plan.stats.skipped,
      projectedUrls:
        existingRows.length + plan.inserts.length,
      actualInserts: 0,
      actualUpdates: 0,
      actualDeletes: 0,
      committed: false,
      success: true
    };

    console.log("\n===== 同步預覽結果 =====");
    console.table(summary);

    return summary;

  } finally {
    if (pool) {
      await pool.close();
      console.log("Azure 連線已關閉");
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length > 1) {
    console.error("FAIL：參數數量錯誤");
    process.exitCode = 1;
  } else {
    runSync(args[0] ?? "preview")
      .then(summary => {
        console.log(
          "SYNC_RESULT",
          JSON.stringify(summary)
        );
      })
      .catch(error => {
        console.error("FAIL：", error.message);
        process.exitCode = 1;
      });
  }
}

module.exports = {
  validateMode,
  runSync
};
