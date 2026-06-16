require('dotenv').config();
// 引入 Google 官方最新的 Gen AI SDK
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// 初始化，它會自動讀取 process.env.GEMINI_API_KEY
// 明確傳入 apiKey 物件給它
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// 建立一個陣列，用來存放這通電話或這次對話的「上下文歷史紀錄」
let scamChatSession = [];

/**
 * 核心防詐分析引擎（同時支援文字、圖片與上下文）
 * @param {Object} input - 輸入物件
 * @param {string} [input.text] - 這次收到的新對話文字
 * @param {string} [input.imagePath] - 這次收到的可疑截圖路徑（選填）
 */
async function analyzeScam(input) {
    try {
        // 1. 準備本次請求的內容陣列
        const currentContents = [];

        // 2. 處理格式差異：如果是圖片，轉成 Base64 格式餵給 Gemini
        if (input.imagePath) {
            const filePath = path.resolve(input.imagePath);
            const imageBuffer = fs.readFileSync(filePath);
            currentContents.push({
                inlineData: {
                    data: imageBuffer.toString("base64"),
                    mimeType: "image/jpeg" // 確保格式正確，如果是 png 改 image/png
                }
            });
            console.log(`\n[📷 系統收到可疑截圖]: ${input.imagePath}`);
        }

        // 3. 處理文字格式
        if (input.text) {
            currentContents.push({ text: `來電者/傳送者說: "${input.text}"` });
            console.log(`\n[💬 系統收到最新對話]: ${input.text}`);
        }

        // 4. 【核心：歷史上下文累積】
        // 將這次的新內容，塞進過去累積的對話紀錄陣列中
        scamChatSession.push({
            role: 'user',
            parts: currentContents
        });

        // 5. 呼叫 Gemini 2.5 Flash 進行精準判斷
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            // 這裡把帶有「所有歷史紀錄 + 這次新內容」的完整上下文陣列丟進去
            contents: scamChatSession,
            config: {
                // 資管系專案標準防詐 Prompt，精準限制輸出格式
                systemInstruction: "你是一位台灣資深的防詐騙專家。請分析使用者提供的歷史對話或圖片截圖。如果發現對方提及『ATM操作』、『監管帳戶』、『法院公文』、『假冒親友急需用錢』、『購買點數』，或語氣具備『恐嚇、催促、不准掛電話、要求保密』等特徵，請立即判定為詐騙。請務必用繁體中文回應，並給出：1. 詐騙風險指數 (0-100%) 2. 核心警告原因。",
                temperature: 0.2, // 降低隨機性，讓防詐判斷更嚴謹
            }
        });

        const aiResponseText = response.text;
        console.log(`\n=== 🚨 Gemini 實時防詐上下文分析結果 ===\n${aiResponseText}\n=======================================`);

        // 6. 記得把 AI 的判定也塞進歷史紀錄，它下一輪才知道自己講過什麼
        scamChatSession.push({
            role: 'model',
            parts: [{ text: aiResponseText }]
        });

    } catch (error) {
        console.error("❌ AI 處理發生錯誤:", error.message);
    }
}

// ==========================================
// 🚀 模擬情境測試（連續通話與截圖的上下文情境）
// ==========================================
// 寫一個簡單的延遲工具
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runValidation() {
    console.log("🛡️ Gemini 防詐分析核心啟動中...");

    // 第一回合
    await analyzeScam({ text: "餵？是宜庭嗎？我是你高中的好朋友啦，我換這支新號碼了，你舊的幫我刪掉喔。" });

    // ── 這裡讓它喘氣 5 秒鐘，避免被 Google 免費機制鎖卡 ──
    console.log("⏱️ 為了避免免費額度被鎖，喘氣 5 秒中...");
    await delay(5000);

    // 第二回合
    await analyzeScam({ text: "對了，我現在在外面剛好要轉一筆貨款，但網網銀突然卡住，你能不能先幫我轉個三萬？我明天中午一上班立刻還你！很急！" });
}

// 執行測試
runValidation();