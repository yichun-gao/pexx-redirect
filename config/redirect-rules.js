// 不在模块顶层直接读取环境变量
function getRedirectRules() {
    const motionPayBaseUrl = process.env.MOTION_PAY_BASE_URL;

    console.log('MotionPay Base URL:', motionPayBaseUrl);

    return {
        GET: [
            {
                pattern: '/motionpay/*',
                target: `${motionPayBaseUrl}/$1`
            }
        ],
        POST: [
            {
                pattern: '/motionpay/*',
                target: `${motionPayBaseUrl}/$1`
            }
        ]
    };
}

module.exports = getRedirectRules;
