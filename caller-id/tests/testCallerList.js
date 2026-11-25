const {
  getCallerList
} = require("../services/callerListService");

async function test() {
  try {
    console.log("正在連線 Azure SQL 資料庫...");

    const list = await getCallerList();

    console.log("資料庫查詢成功！");
    console.log("有效來電辨識數量：", list.length);

    console.log("前 5 筆資料：");
    console.table(list.slice(0, 5));

    const counts = {};

    for (const item of list) {
      counts[item.label] =
        (counts[item.label] || 0) + 1;
    }

    console.log("來電分類統計：");
    console.table(counts);

  } catch (error) {
    console.error("查詢失敗：", error.message);
    process.exitCode = 1;
  }
}

test();