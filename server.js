const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const redirectHandler = require('./middleware/redirect-handler');
const logger = require('./utils/logger');

// 根据 NODE_ENV 加载对应的 .env 文件
const env = process.env.NODE_ENV || 'dev';
const envFile = `.env.${env}`;

dotenv.config({
    path: path.resolve(process.cwd(), envFile)
});

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

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
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        protocol: req.protocol
    });
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

// 限制请求体大小
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 启动HTTP服务器
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => {
    logger.info(`HTTP server listening on port ${PORT}`);
});

// 尝试启动HTTPS服务器
try {
    // 检查证书文件是否存在
    const keyPath = path.resolve(process.cwd(), 'certificates/private-key.pem');
    const certPath = path.resolve(process.cwd(), 'certificates/certificate.pem');

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        const privateKey = fs.readFileSync(keyPath, 'utf8');
        const certificate = fs.readFileSync(certPath, 'utf8');
        const credentials = { key: privateKey, cert: certificate };

        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(HTTPS_PORT, () => {
            logger.info(`HTTPS server listening on port ${HTTPS_PORT}`);
        });

        // 添加HTTPS特定的错误处理
        httpsServer.on('error', (err) => {
            logger.error('HTTPS server error:', err);
        });
    } else {
        logger.info('SSL certificates not found, HTTPS server not started');
        logger.info('HTTP server running on port', PORT);
        logger.info('To enable HTTPS, place certificates in ./certificates/ directory');
    }
} catch (err) {
    logger.info('HTTP server running on port', PORT);
}

module.exports = app;
