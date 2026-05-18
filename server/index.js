const express = require('express');
const app = express();

app.use(express.json());

// 🟢 首頁連線測試
app.get('/', (req, res) => {
    res.send('AI Shield Server Running! 後端伺服器測試成功！');
});

// 🚀 1. 主頁專用 API（常見詐騙手法 TOP 3）
app.get('/api/home', (req, res) => {
    console.log('--- 收到前端請求：載入主頁資料 ---');
    res.json({
        status: 'success',
        topScamMethods: [
            { rank: 1, name: "網路購物詐騙", count: 128 },
            { rank: 2, name: "假投資詐騙", count: 34 },
            { rank: 3, name: "假交友(投資財財)詐騙", count: 24 }
        ],
        latestNews: [
            "【警報】近期假冒電信商簡訊猖獗，請勿點擊未知連結！",
            "【小知識】接起電話聽到『解除分期付款』百分之百是詐騙。"
        ]
    });
});

// 📞 2. 電話查詢 API
app.get('/api/search/phone', (req, res) => {
    const phoneNumber = req.query.number; 
    console.log(`[電話查詢] 號碼是: ${phoneNumber}`);

    if (phoneNumber === '0912345678') {
        res.json({
            status: 'success',
            number: '+886 987 654 321',
            carrier: '台灣 大哥大',
            riskLevel: '高風險號碼',
            riskScore: 95,
            riskInfo: '該號碼已被 128 人舉報為假冒網購客服詐騙。',
            userReport: '回報記錄：假冒商家要求解除分期付款。'
        });
    } else if (phoneNumber === '0988888888') {
        res.json({
            status: 'success',
            number: '+886 987 654 321',
            carrier: '台灣 大哥大',
            riskLevel: '中風險號碼',
            riskScore: 55,
            riskInfo: '該號碼近期有異常發話頻率，疑似推銷或不詳來電，請提高警覺。',
            userReport: '回報記錄：接通後隨即掛斷，或假冒貸款推銷。'
        });
    } else {
        res.json({
            status: 'success',
            number: '+886 987 654 321',
            carrier: '台灣 大哥大',
            riskLevel: '低風險號碼',
            riskScore: 5,
            riskInfo: '目前無此號碼的詐騙舉報紀錄。',
            userReport: '尚無用戶回報。'
        });
    }
});

// 💬 3. LINE ID 查詢 API
app.get('/api/search/line', (req, res) => {
    const lineId = req.query.id; 
    console.log(`[LINE查詢] 收到 ID: ${lineId}`);

    if (lineId === 'badboy888') {
        res.json({
            status: 'success',
            id: '@1234',
            riskLevel: '高風險帳號',
            riskInfo: '此 LINE ID 涉嫌假冒投資虛擬貨幣詐騙，已被多位用戶通報。',
            userReport: '用戶舉報：誆稱有內線消息，引導加入投資群組。'
        });
    } else {
        res.json({
            status: 'success',
            id: '@1234',
            riskLevel: '低風險帳號',
            riskInfo: '目前查無此 LINE ID 的通報紀錄，請保持警覺。',
            userReport: '尚無用戶回報。'
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`伺服器已啟動：http://localhost:${PORT}`);
});