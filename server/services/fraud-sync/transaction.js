const sql = require("mssql");

const LOCK_NAME = "AI_SHIELD_FRAUD_SYNC";

async function acquireImportLock(transaction) {
  const request = new sql.Request(transaction);

  request.input(
    "resource",
    sql.NVarChar(255),
    LOCK_NAME
  );

  const result = await request.query(`
    DECLARE @lockResult INT;

    EXEC @lockResult = sys.sp_getapplock
      @Resource = @resource,
      @LockMode = 'Exclusive',
      @LockOwner = 'Transaction',
      @LockTimeout = 5000;

    SELECT @lockResult AS lock_result;
  `);

  const code = result.recordset[0]?.lock_result;

  if (!Number.isInteger(code) || code < 0) {
    throw new Error(
      "無法取得匯入鎖定，停止本次匯入"
    );
  }

  return code;
}

async function runRollbackTransaction(
  transaction,
  acquireLock,
  execute
) {
  let active = false;

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

    await transaction.rollback();

    active = false;

    return {
      result,
      committed: false,
      rolledBack: true
    };

  } catch (error) {
    if (active) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "交易執行及回滾發生錯誤"
        );
      }
    }

    throw error;
  }
}

module.exports = {
  LOCK_NAME,
  acquireImportLock,
  runRollbackTransaction
};
