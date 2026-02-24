const redirectRules = require('../config/redirect-rules');
const logger = require('../utils/logger');

function redirectHandler(req, res, next) {
    const method = req.method.toUpperCase();
    const url = req.url;

    // 获取对应HTTP方法的重定向规则
    const rules = redirectRules[method] || [];

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

    const target = url.parse(targetUrl);
    const isHttps = target.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: target.path,
        method: req.method,
        headers: {
            ...req.headers,
            host: target.host
        }
    };

    const proxyReq = client.request(options, (proxyRes) => {
        // 直接返回200状态码，将目标服务器响应透传给客户端
        res.writeHead(200, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        logger.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy Error', message: err.message });
    });

    // 转发请求体（如果有）
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.pipe(proxyReq);
    } else {
        proxyReq.end();
    }
}

module.exports = redirectHandler;
