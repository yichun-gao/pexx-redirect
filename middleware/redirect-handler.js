const getRedirectRules = require('../config/redirect-rules');
const logger = require('../utils/logger');

function redirectHandler(req, res, next) {
    const method = req.method.toUpperCase();
    const url = req.url;

    // 获取对应HTTP方法的重定向规则
    const rules = getRedirectRules()[method] || [];

    // 查找匹配的规则
    for (const rule of rules) {
        if (matchesPattern(url, rule.pattern)) {
            const targetUrl = buildTargetUrl(url, rule.pattern, rule.target);

            logger.info(`Proxying ${method} ${url} to ${targetUrl}`);

            // 统一使用代理方式，返回200状态码
            proxyRequest(req, res, targetUrl);
            return;
        }
    }

    // 没有匹配的规则，继续到下一个中间件
    next();
}

// 检查URL是否匹配模式
function matchesPattern(url, pattern) {
    if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '(.*)');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(url);
    }
    return url === pattern;
}

// 构建目标URL
function buildTargetUrl(sourceUrl, pattern, target) {
    if (pattern.includes('*')) {
        const regexPattern = pattern.replace(/\*/g, '(.*)');
        const match = sourceUrl.match(new RegExp(`^${regexPattern}$`));
        if (match && match[1]) {
            return target.replace('$1', match[1]);
        }
    }
    return target;
}

// 统一代理函数（支持所有HTTP方法）
function proxyRequest(req, res, targetUrl) {
    const https = require('https');
    const http = require('http');
    const url = require('url');

    const target = url.parse(targetUrl);  // 解析目标URL
    const isHttps = target.protocol === 'https:';  // 判断是否HTTPS
    const client = isHttps ? https : http;  // 选择合适的HTTP客户端

    console.log(`Proxying ${req.method} ${req.url} to ${targetUrl}`);

    // 修复：清理无关请求头，避免冲突
    const headers = { ...req.headers };
    delete headers.host; // 移除原始host，改用target.host
    delete headers['content-length']; // 手动管理content-length，避免不匹配
    headers.host = target.host;

    const options = {
        hostname: target.hostname,     // 目标主机名
        port: target.port || (isHttps ? 443 : 80),  // 端口
        path: target.path,             // 请求路径
        method: req.method,            // HTTP方法保持不变
        headers: headers
    };


    const proxyReq = client.request(options, (proxyRes) => {
        console.log(`Target response: ${proxyRes.statusCode}`);
        // 将目标服务器响应直接透传给客户端
        res.writeHead(proxyRes.statusCode, proxyRes.headers);  // 保留响应头
        proxyRes.pipe(res);  // 流式传输响应体
    });


    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        if (!res.headersSent) {  // 确保只发送一次响应
            res.status(502).json({ error: 'Bad Gateway', message: err.message });
        }
    });

    // 核心修复：统一处理请求体传输
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        // 场景1：req.body已被解析（如body-parser处理过）
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('Using parsed req.body...');
            const bodyBuffer = Buffer.isBuffer(req.body)
                ? req.body
                : (typeof req.body === 'string'
                    ? Buffer.from(req.body)
                    : Buffer.from(JSON.stringify(req.body)));

            // 修复：手动设置正确的content-length
            proxyReq.setHeader('Content-Length', bodyBuffer.length);
            // 写入并结束流（一次性写入完整body）
            proxyReq.write(bodyBuffer);
            proxyReq.end(); // 写入完成后显式结束
        }
        // 场景2：req.body未解析，使用原始流（未被消费）
        else {
            console.log('Piping raw request stream...');
            // 修复：pipe自动管理流，无需手动end（pipe会在req结束时自动调用proxyReq.end()）
            req.pipe(proxyReq);

            // 监听req流错误，避免卡死
            req.on('error', (err) => {
                console.error('Request stream error:', err);
                if (!proxyReq.finished) {
                    proxyReq.destroy(err); // 销毁proxyReq，避免挂起
                }
            });
        }
    }
    // GET/HEAD请求：无请求体，直接结束proxyReq
    else {
        console.log('No request body (GET/HEAD), ending proxy request');
        proxyReq.end();
    }
}



module.exports = redirectHandler;
