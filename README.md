AI Shield - 實時語音詐騙檢測系統
AI Shield 是一款結合深度學習技術的移動端應用程式，旨在防止日益嚴重的語音詐騙（Deepfake Voice）。系統能即時分析通話或錄音內容，檢測是否為合成語音，並進行情緒分析以評估潛在的詐騙風險。

核心功能
實時語音檢測：識別語音是否由 AI 模型合成（TTS/VC 檢測）。

情緒壓力分析：透過語音情緒辨識，判斷來電者是否刻意製造壓力情境。

即時警告系統：一旦發現疑似詐騙特徵，立即在手機介面彈出警告。

詐騙資料庫比對：串接資料庫分析常見的詐騙話術關鍵字。

技術架構
專案採用前後端分離架構：

前端 (Client): 基於 React Native (Expo) 構建，支援跨平台預覽與操作。

後端 (Server): 使用 Node.js (Express) 處理 API 請求與音訊中繼。

AI 引擎: 預計使用 Python 結合深度學習模型（如 CNN, Transformer）進行語音生物特徵分析。

資料夾結構
Plaintext
AI-Shield/
├── client/          # React Native (Expo) 前端 App
├── server/          # Node.js 後端 API 伺服器
└── README.md        # 專案說明文件
快速啟動
1. 環境需求
Node.js (LTS 版本)

npm 或 yarn

手機安裝 Expo Go App (iOS/Android)

2. 安裝與執行
前端 (Client)
Bash
cd client
npm install
npx expo start
掃描終端機顯示的 QR Code 即可在 Expo Go 中開啟。

後端 (Server)
Bash
cd server
npm install
node index.js
預設伺服器運行於：http://localhost:3000

開發計畫 (Roadmap)
[x] 專案基礎架構搭建 (React Native + Node.js)

[ ] 前端錄音與音訊串流功能開發

[ ] 後端 AI 模型介面整合 (Python FastAPI/Flask)

[ ] 語音合成檢測模型訓練與測試

[ ] 實機測試與效能優化

貢獻者
開發者: [李宜庭 / Saevetr]

學校: 國立雲林科技大學 (YunTech) - 資訊管理系

開啟QR code指令 npx expo start
一定要同個網路