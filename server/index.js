const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('AI Shield Server Running! 後端伺服器測試成功！');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`伺服器已啟動：http://localhost:${PORT}`);
});