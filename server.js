const express = require('express');
const dotenv = require('dotenv');
const redirectHandler = require('./middleware/redirect-handler');
const logger = require('./utils/logger');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// 应用重定向处理器
app.use(redirectHandler);

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
    logger.info(`Redirect server listening on port ${PORT}`);
});

module.exports = app;
