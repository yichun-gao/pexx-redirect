
// 重定向规则配置（现在是代理规则）
const motionPayBaseUrl = process.env.MOTION_PAY_BASE_URL;

const redirectRules = {
    // GET请求代理规则
    GET: [
        {
            pattern: '/motionpay/*',
            target: `${motionPayBaseUrl}/$1`
        }
    ],

    // POST请求代理规则
    POST: [
        {
            pattern: '/motionpay/*',
            target: `${motionPayBaseUrl}/$1`
        }
    ],
};

module.exports = redirectRules;