const SOURCE = {
  name: "165反詐騙諮詢專線－遭停止解析涉詐網站",
  url: "https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/29E8E643-88ED-4952-B21E-BD42A3B7108C/resource/9012A805-D567-49C6-9F47-B89E1711AB14/download"
};

async function fetchFraudData() {
  console.log("===== AI Shield 資料抓取系統 =====");
  console.log("資料來源：", SOURCE.name);
  console.log("開始時間：", new Date().toISOString());
  console.log("正在下載資料...");

  const response = await fetch(SOURCE.url, {
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`下載失敗：HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("下載的資料為空");
  }

  let csv;
  let encoding = "UTF-8";

  try {
    csv = new TextDecoder("utf-8", {
      fatal: true
    }).decode(buffer);
  } catch {
    csv = new TextDecoder("big5", {
      fatal: true
    }).decode(buffer);
    encoding = "Big5";
  }

  csv = csv.replace(/^\uFEFF/, "");

  if (/^\s*(<|\{|\[)/.test(csv)) {
    throw new Error("下載內容疑似不是 CSV 格式");
  }

  console.log("下載成功！");
  console.log("HTTP 狀態：", response.status);
  console.log("Content-Type：", response.headers.get("content-type"));
  console.log("檔案大小：", (buffer.length / 1024).toFixed(2), "KB");
  console.log("資料編碼：", encoding);

  return csv;
}

if (require.main === module) {
  fetchFraudData()
    .then(csv => {
      const lines = csv.split(/\r?\n/).filter(line => line.trim());

      console.log("文字行數：", lines.length);
      console.log("\n===== CSV 前五行 =====");
      console.log(lines.slice(0, 5).join("\n"));

      console.log("\n===== 測試完成 =====");
      console.log("尚未連線或修改 Azure 資料庫");
    })
    .catch(error => {
      console.error("資料抓取失敗：", error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  SOURCE,
  fetchFraudData
};
