const sql = require("mssql");

async function runProductionTransaction(
  transaction,
  acquireLock,
  execute
) {
  let active = false;
  let committing = false;

  transaction.on("rollback", () => {
    active = false;
  });

  try {
    await transaction.begin(
      sql.ISOLATION_LEVEL.SERIALIZABLE
    );

    active = true;

    await acquireLock(transaction);

    const result = await execute(transaction);

    if (!active) {
      throw new Error("交易已被取消");
    }

    if (
      !result ||
      !Number.isSafeInteger(result.inserted) ||
      !Number.isSafeInteger(result.updated) ||
      result.inserted < 0 ||
      result.updated < 0 ||
      result.deleted !== 0
    ) {
      throw new Error("交易執行結果異常");
    }

    committing = true;

    await transaction.commit();

    active = false;

    return {
      result,
      committed: true,
      rolledBack: false
    };

  } catch (error) {
    if (active) {
      try {
        await transaction.rollback();
        active = false;
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "交易失敗且回滾結果無法確認"
        );
      }
    }

    if (committing) {
      throw new Error(
        "提交結果無法確認，請重新查詢資料庫，不可直接重試",
        { cause: error }
      );
    }

    throw error;
  }
}

module.exports = {
  runProductionTransaction
};
