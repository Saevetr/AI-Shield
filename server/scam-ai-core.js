require('dotenv').config();
// 引入 Google 官方最新的 Gen AI SDK
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// 初始化，自動讀取 process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// 建立一個陣列，用來存放這通電話或這次對話的「上下文歷史紀錄」
let scamChatSession = [];

/**
 * 輔助函式：將本地檔案轉換為 Gemini 所需的 Base64 inlineData 格式
 * @param {string} relativePath - 檔案相對路徑
 * @param {string} mimeType - 檔案的媒體類型 (例如 image/jpeg, audio/mp3)
 */
function fileToGenerativePart(relativePath, mimeType) {
    const filePath = path.resolve(relativePath);
    if (!fs.existsSync(filePath)) {
        throw new Error(`找不到檔案: ${filePath}`);
    }
    return {
        inlineData: {
            data: fs.readFileSync(filePath).toString("base64"),
            mimeType: mimeType
        }
    };
}

/**
 * 核心防詐分析引擎（同時支援文字、圖片、語音音檔與上下文環境）
 * @param {Object} input - 輸入物件
 * @param {string} [input.text] - 這次收到的新對話/語音轉文字字串（選填）
 * @param {string} [input.imagePath] - 這次收到的可疑截圖路徑（選填）
 * @param {string} [input.audioPath] - 這次收到的錄音檔路徑，如 .mp3 或 .wav（選填）
 */
async function analyzeScam(input) {
    try {
        // 1. 準備本次請求的 Parts 陣列
        const currentParts = [];

        // 2. 處理圖片辨識
        if (input.imagePath) {
            // 判斷副檔名決定 mimeType
            const ext = path.extname(input.imagePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            
            const imagePart = fileToGenerativePart(input.imagePath, mimeType);
            currentParts.push(imagePart);
            console.log(`\n[📷 系統收到可疑截圖]: ${input.imagePath}`);
        }

        // 3. 處理語音功能 (多模態直接輸入音檔)
        if (input.audioPath) {
            const ext = path.extname(input.audioPath).toLowerCase();
            // 根據常見格式對應 mimeType
            let mimeType = 'audio/mp3';
            if (ext === '.wav') mimeType = 'audio/wav';
            if (ext === '.m4a') mimeType = 'audio/m4a';

            const audioPart = fileToGenerativePart(input.audioPath, mimeType);
            currentParts.push(audioPart);
            console.log(`\n[🎵 系統收到即時錄音檔]: ${input.audioPath}`);
        }

        // 4. 處理文字對話
        if (input.text) {
            currentParts.push({ text: `來電者/傳送者說: "${input.text}"` });
            console.log(`\n[💬 系統收到最新對話]: ${input.text}`);
        }

        // 防呆：如果什麼都沒有輸入，就不往下執行
        if (currentParts.length === 0) {
            console.log("⚠️ 本回合無有效輸入資料。");
            return;
        }

        // 5. 【核心：歷史上下文累積】
        // 將包含（文字/圖片/語音）的 Parts 陣列塞進這一次的 user 紀錄中
        scamChatSession.push({
            role: 'user',
            parts: currentParts
        });

        // 6. 呼叫 Gemini 3.1 Pro Preview 進行精準判斷
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview',
            contents: scamChatSession,
            config: {
                // 資管系專案標準防詐 Prompt，精準限制輸出格式
                systemInstruction: "你是一位台灣資深的防詐騙專家。請分析使用者提供的歷史對話、圖片截圖或語音錄音檔。如果發現對方提及『ATM操作』、『監管帳戶』、『法院公文』、『假冒親友急需用錢』、『購買點數』，或語氣具備『恐嚇、催促、不准掛電話、要求保密』等特徵，請立即判定為詐騙。請務必用繁體中文回應，並給出：1. 詐騙風險指數 (0-100%) 2. 核心警告原因。",
                temperature: 0.2, // 降低隨機性，讓防詐判斷更嚴謹
                
                // 開啟 Gemini 3.1 的強大 Thinking 思考鏈功能，讓它在背景拆解詐騙話術
                thinkingConfig: {
                    thinkingBudget: 2048 // 給予足夠的 Token 進行邏輯推理
                }
            }
        });

        const aiResponseText = response.text;
        console.log(`\n=== 🚨 實時防詐多模態分析結果 ===\n${aiResponseText}\n=======================================`);

        // 7. 記得把 AI 的判定也塞進歷史紀錄，保持上下文完整
        scamChatSession.push({
            role: 'model',
            parts: [{ text: aiResponseText }]
        });

    } catch (error) {
        console.error("❌ AI 多模態處理發生錯誤:", error.message);
    }
}

// ==========================================
// 🚀 模擬情境測試（包含語音與圖片的跨模態對話）
// ==========================================
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runValidation() {
    console.log("🛡️ Gemini 多模態防詐分析核心啟動中...");

    // 模擬測試前準備：請確保專案目錄下有對應的測試檔案，否則可先將 path 註解掉
    // 這裡先建立虛擬測試情境說明

    // 第一回合：收到一封可疑的簡訊/LINE 截圖 (圖片辨識)
    console.log("\n--- [第一回合：處理可疑截圖] ---");
    // 提示：實際測試時，請在專案目錄放一張對應的圖片，或先註解此行
    try {
        await analyzeScam({ 
            text: "收到這張罰單過期的通知簡訊，叫我點網址繳費...",
            imagePath: "./ticket_scam.png" 
        });
    } catch (e) {
        // 若找不到檔案則降級用純文字測試
        await analyzeScam({ text: "收到一封簡訊說我國道通行費欠費，叫我點進去一個奇怪的網址繳費..." });
    }

    console.log("\n⏱️ 喘氣 5 秒鐘，避免 API Rate Limit...");
    await delay(5000);

    // 第二回合：接著接到一通可疑電話 (語音功能，直接傳入錄音檔)
    console.log("\n--- [第二回合：處理即時語音] ---");
    // 提示：實際測試時，可放一段錄音檔（如：詐騙集團說要監管帳戶的聲音）
    try {
        await analyzeScam({ 
            audioPath: "./suspicious_call.mp3" 
        });
    } catch (e) {
        // 若找不到檔案則降級用文字模擬語音辨識後的結果
        await analyzeScam({ text: "（電話內聲音）我是台北地檢署林檢察官，你涉嫌一起洗錢案，現在要立刻清查你的財產，請把錢轉到指定安全帳戶配合監管，否則立刻收押！" });
    }
}

// 執行測試
runValidation();