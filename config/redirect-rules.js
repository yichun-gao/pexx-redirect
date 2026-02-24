// 重定向规则配置
const redirectRules = {
    // GET请求重定向规则
    GET: [
        {
            pattern: '/old-page',
            target: 'https://new-domain.com/new-page',
            statusCode: 301
        },
        {
            pattern: '/api/v1/*',
            target: 'https://api.new-domain.com/v2/$1',
            statusCode: 308
        }
    ],

    // POST请求重定向规则
    POST: [
        {
            pattern: '/submit-form',
            target: 'https://forms.new-domain.com/process',
            statusCode: 307,
            preserveBody: true
        }
    ]
};

module.exports = redirectRules;
