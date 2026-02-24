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

            logger.info(`Redirecting ${method} ${url} to ${targetUrl} with status ${rule.statusCode}`);

            // 处理POST请求的数据转发
            if (method === 'POST' && rule.preserveBody) {
                // 对于需要保留body的POST请求，使用代理方式
                proxyPostRequest(req, res, targetUrl, rule.statusCode);
            } else {
                // 普通重定向
                res.redirect(rule.statusCode, targetUrl);
            }

            return;
        }
    }

    // 没有匹配的规则，继续到下一个中间件
    next();
}

// 检查URL是否匹配模式
function matchesPattern(url, pattern) {
    if (pattern.includes('*')) {
        // 处理通配符模式
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

// 代理POST请求
function proxyPostRequest(req, res, targetUrl, statusCode) {
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
        method: 'POST',
        headers: {
            ...req.headers,
            host: target.host
        }
    };

    const proxyReq = client.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        logger.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy Error' });
    });

    // 转发请求体
    req.pipe(proxyReq);
}

module.exports = redirectHandler;
