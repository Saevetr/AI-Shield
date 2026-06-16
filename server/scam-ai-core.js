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
 * 核心防詐分析引擎（供後端 Express 路由直接呼叫）
 * 整合「文字 + 圖片截圖 + 語音錄音」三合一
 */
async function analyzeScamAPI(req, res) {
    try {
        const scamText = req.body.text;
        
        // 取得 Multer 傳過來的多模態檔案物件 (.fields 格式)
        const scamImageFile = req.files?.["scamImage"]?.[0];
        const scamAudioFile = req.files?.["scamAudio"]?.[0];

        // 準備本次請求的 Parts 陣列
        const currentParts = [];

        // 1. 處理圖片辨識
        if (scamImageFile) {
            const ext = path.extname(scamImageFile.path).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            
            const imagePart = fileToGenerativePart(scamImageFile.path, mimeType);
            currentParts.push(imagePart);
            console.log(`\n[📷 系統收到可疑截圖]: ${scamImageFile.path}`);
        }

        // 2. 處理語音功能 (多模態直接輸入音檔)
        if (scamAudioFile) {
            const ext = path.extname(scamAudioFile.path).toLowerCase();
            let mimeType = 'audio/mp3';
            if (ext === '.wav') mimeType = 'audio/wav';
            if (ext === '.m4a') mimeType = 'audio/m4a';

            const audioPart = fileToGenerativePart(scamAudioFile.path, mimeType);
            currentParts.push(audioPart);
            console.log(`\n[🎵 系統收到即時錄音檔]: ${scamAudioFile.path}`);
        }

        // 3. 處理文字對話
        if (scamText && scamText.trim() !== "") {
            currentParts.push({ text: `來電者/傳送者說: "${scamText}"` });
            console.log(`\n[💬 系統收到最新對話]: ${scamText}`);
        }

        // 防呆：如果什麼都沒有輸入，就不往下執行
        if (currentParts.length === 0) {
            return res.status(400).json({
                success: false,
                message: "無有效的輸入資料（文字、圖片或語音）。"
            });
        }

        // 4. 【核心：歷史上下文累積】
        scamChatSession.push({
            role: 'user',
            parts: currentParts
        });

        // 5. 呼叫 Gemini 3.1 Pro Preview 進行精準判斷
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-pro-preview', // 鎖定 3.1 Pro 核心
            contents: scamChatSession,      // 帶入完整歷史上下文
            config: {
                systemInstruction: "你是一位台灣資深的防詐騙專家。請分析使用者提供的歷史對話、圖片截圖或語音錄音檔。如果發現對方提及『ATM操作』、『監管帳戶』、『法院公文』、『假冒親友急需用錢』、『購買點數』，或語氣具備『恐嚇、催促、不准掛電話、要求保密』等特徵，請立即判定為詐騙。請務必用繁體中文回應，並給出：1. 詐騙風險指數 (0-100%) 2. 核心警告原因。",
                temperature: 0.2, 
                
                // 開啟 Gemini 3.1 核心亮點：Thinking 思考鏈推理
                thinkingConfig: {
                    thinkingBudget: 2048 
                }
            }
        });

        const aiResponseText = response.text;
        console.log(`\n=== 🚨 實時防詐多模態分析結果 ===\n${aiResponseText}\n=======================================`);

        // 6. 記得把 AI 的判定也塞進歷史紀錄，保持上下文完整
        scamChatSession.push({
            role: 'model',
            parts: [{ text: aiResponseText }]
        });

        // 7. 異步安全刪除伺服器上的暫存檔案，防止硬碟爆滿
        if (scamImageFile && fs.existsSync(scamImageFile.path)) fs.unlinkSync(scamImageFile.path);
        if (scamAudioFile && fs.existsSync(scamAudioFile.path)) fs.unlinkSync(scamAudioFile.path);

        // 8. 回傳分析報告給前端
        return res.json({
            success: true,
            data: {
                analysisReport: aiResponseText
            }
        });

    } catch (error) {
        console.error("❌ AI 多模態處理發生錯誤:", error.message);
        return res.status(500).json({
            success: false,
            message: "AI 多模態分析失敗",
            error: error.message
        });
    }
}

// ⭐️ 導出此函式，供 index.js 呼叫
module.exports = { analyzeScamAPI };