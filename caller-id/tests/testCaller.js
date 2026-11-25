const { lookupCaller } = require("../api/callerLookup");
const { classifyCaller } = require("../services/callerClassifier");

async function test() {
  try {
    const result = await lookupCaller(process.argv[2]);
    const caller = classifyCaller(result);

    console.log("\n===== 來電辨識結果 =====");
    console.log("電話號碼：", result.phone);
    console.log("來電類型：", caller.title);
    console.log("風險分數：", caller.score ?? "未知");
    console.log("提醒內容：", caller.message);
    console.log("========================");
  } catch (error) {
    console.log("暫時無法辨識");
    console.log("錯誤原因：", error.message);
  }
}

test();
