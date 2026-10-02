require('dotenv').config();
// 引入 Google 官方最新的 Gen AI SDK
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// 取得 API Key（延遲或啟動時檢查）
const getGenAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY 環境變數未設定，無法使用 AI 分析服務");
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * 安全刪除暫存檔案輔助函式
 */
function safeDeleteFile(filePath) {
    if (!filePath) return;
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.warn(`[⚠️ 暫存檔刪除失敗] ${filePath}:`, err.message);
    }
}

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
 * 修正：移除全域 scamChatSession，防止不同使用者之間通話與個資串供外洩
 */
async function analyzeScamAPI(req, res) {
    const scamImageFile = req.files?.["scamImage"]?.[0];
    const scamAudioFile = req.files?.["scamAudio"]?.[0];

    try {
        const scamText = req.body.text;
        
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
            const ext = (path.extname(scamAudioFile.originalname || scamAudioFile.path) || '').toLowerCase();
            let mimeType = scamAudioFile.mimetype || 'audio/mp3';
            if (ext === '.wav' || mimeType.includes('wav')) mimeType = 'audio/wav';
            else if (ext === '.m4a' || mimeType.includes('m4a') || mimeType.includes('mp4')) mimeType = 'audio/m4a';
            else if (ext === '.webm' || mimeType.includes('webm')) mimeType = 'audio/webm';
            else if (ext === '.ogg' || mimeType.includes('ogg')) mimeType = 'audio/ogg';
            else if (ext === '.aac' || mimeType.includes('aac')) mimeType = 'audio/aac';
            else if (ext === '.mp3' || mimeType.includes('mpeg')) mimeType = 'audio/mp3';

            const audioPart = fileToGenerativePart(scamAudioFile.path, mimeType);
            currentParts.push(audioPart);
            console.log(`\n[🎵 系統收到即時錄音檔]: ${scamAudioFile.path} (${mimeType})`);
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

        // 4. 【修復全域污染】每個請求使用獨立的上下文，可選接受客戶端帶來的對話歷程
        const requestContents = [];
        if (req.body.history) {
            try {
                const clientHistory = typeof req.body.history === 'string'
                    ? JSON.parse(req.body.history)
                    : req.body.history;
                if (Array.isArray(clientHistory)) {
                    // 最多取最近 6 則對話，防止 context 超限
                    requestContents.push(...clientHistory.slice(-6));
                }
            } catch (e) {
                console.warn("無法解析傳入的 history，改為僅分析本次輸入");
            }
        }

        requestContents.push({
            role: 'user',
            parts: currentParts
        });

        const ai = getGenAIClient();

        // 5. 呼叫 Gemini 進行判斷（相容 2.5 / 3.x）
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // 使用穩定泛用模型；或支援從環境變數指定
            contents: requestContents,
            config: {
                systemInstruction: "你是一位台灣資深的防詐騙專家。請分析使用者提供的歷史對話、圖片截圖或語音錄音檔。如果發現對方提及『ATM操作』、『監管帳戶』、『法院公文』、『假冒親友急需用錢』、『購買點數』，或語氣具備『恐嚇、催促、不准掛電話、要求保密』等特徵，請立即判定為詐騙。請務必用繁體中文回應，並給出：1. 詐騙風險指數 (0-100%) 2. 核心警告原因。",
                temperature: 0.2,
            }
        });

        const aiResponseText = response.text || "";
        console.log(`\n=== 🚨 實時防詐多模態分析結果 ===\n${aiResponseText}\n=======================================`);

        // 6. 回傳分析報告給前端
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
    } finally {
        // 7. 【修復暫存檔洩漏】無論成功或失敗，都務必清理上傳暫存檔
        if (scamImageFile?.path) safeDeleteFile(scamImageFile.path);
        if (scamAudioFile?.path) safeDeleteFile(scamAudioFile.path);
    }
}

// ⭐️ 導出此函式，供 index.js 呼叫
module.exports = { analyzeScamAPI };
