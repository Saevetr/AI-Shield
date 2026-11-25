
const API_BASE = "https://ai-shield-m68d.onrender.com";

async function lookupCaller(phoneNumber) {
  const phone = String(phoneNumber).replace(/\D/g, "");

  if (phone.length < 6) {
    throw new Error("電話號碼格式不正確");
  }

  console.log("正在查詢電話號碼：", phone);
  console.log("正在連線至雲端伺服器...");

  const response = await fetch(
    `${API_BASE}/api/check/check-phone`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
      signal: AbortSignal.timeout(90000),
    }
  );

  const result = await response.text();

  console.log("HTTP 狀態碼：", response.status);
  console.log("伺服器回傳內容：", result);

  if (!response.ok) {
    throw new Error(`查詢失敗：${response.status}`);
  }

  return JSON.parse(result);
}

module.exports = { lookupCaller };
