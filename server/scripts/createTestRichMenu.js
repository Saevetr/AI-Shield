
require("dotenv").config({
    path: require("path").join(__dirname, "../.env")
});

const fs = require("fs");
const path = require("path");

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const userId = process.env.LINE_TEST_USER_ID;

if (!token) {
    throw new Error("缺少 LINE_CHANNEL_ACCESS_TOKEN");
}

if (!userId || !/^U[0-9a-f]{32}$/i.test(userId)) {
    throw new Error("請確認 LINE_TEST_USER_ID 是否正確");
}

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

const headers = {
    Authorization: `Bearer ${token}`
};

function createArea(x, y, width, height, text) {
    return {
        bounds: { x, y, width, height },
        action: {
            type: "message",
            text
        }
    };
}

const richMenu = {
    size: {
        width: 2500,
        height: 1686
    },
    selected: true,
    name: "麥騙 AI Shield 個人測試版 V2",
    chatBarText: "防詐功能選單",
    areas: [
    // 第一排
    createArea(30, 450, 610, 575, "文字分析"),
    createArea(645, 450, 600, 575, "圖片分析"),
    createArea(1250, 450, 605, 575, "語音分析"),
    createArea(1860, 450, 610, 575, "電話查詢"),

    // 第二排
    createArea(30, 1040, 610, 600, "LINE ID 查詢"),
    createArea(645, 1040, 600, 600, "網址查詢"),
    createArea(1250, 1040, 605, 600, "防詐知識"),
    createArea(1860, 1040, 610, 600, "使用說明")
]
};

async function checkResponse(response) {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status}: ${error}`);
    }
}

async function main() {
    const imagePath = path.join(
        __dirname,
        "../assets/rich-menu-v2.jpg"
    );

    const image = fs.readFileSync(imagePath);

    if (image.length > 1024 * 1024) {
        throw new Error("圖片大小超過 1MB");
    }

    // 1. 建立圖文選單
    const createResponse = await fetch(
        `${API}/richmenu`,
        {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(richMenu)
        }
    );

    await checkResponse(createResponse);

    const { richMenuId } = await createResponse.json();

    console.log("✅ 圖文選單建立成功");
    console.log("Rich Menu ID:", richMenuId);

    // 2. 上傳圖文選單圖片
    const uploadResponse = await fetch(
        `${DATA_API}/richmenu/${richMenuId}/content`,
        {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": "image/jpeg"
            },
            body: image
        }
    );

    await checkResponse(uploadResponse);

    console.log("✅ 圖文選單圖片上傳成功");

    // 3. 只綁定自己的 LINE 帳號
    const linkResponse = await fetch(
        `${API}/user/${userId}/richmenu/${richMenuId}`,
        {
            method: "POST",
            headers
        }
    );

    await checkResponse(linkResponse);

    console.log("✅ 個人測試選單綁定成功");
    console.log("✅ 未修改所有好友的預設選單");
    console.log("📱 請開啟手機 LINE 測試");
}

main().catch(error => {
    console.error("❌ 執行失敗：", error.message);
    process.exitCode = 1;
});
