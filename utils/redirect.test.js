const request = require('supertest');
const app = require('../server');

describe('Redirect Service', () => {
    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
        });
    });

    describe('GET redirects', () => {
        it('should handle simple redirect', async () => {
            // 这里需要根据实际配置的重定向规则来测试
            const response = await request(app).get('/old-page');
            expect([301, 302, 307, 308]).toContain(response.status);
        });
    });

    describe('POST redirects', () => {
        it('should handle POST redirect with body preservation', async () => {
            const testData = { name: 'test', value: 'data' };
            const response = await request(app)
                .post('/submit-form')
                .send(testData)
                .expect([307, 308]);
        });
    });

    describe('404 handling', () => {
        it('should return 404 for unknown routes', async () => {
            const response = await request(app).get('/non-existent-path');
            expect(response.status).toBe(404);
        });
    });
});
