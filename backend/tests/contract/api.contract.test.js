const request = require('supertest');
const app = require('../../app'); // Assumes app.js is the express app
const { registerSchema, loginSchema } = require('shared');

describe('API Contract Tests', () => {
    describe('POST /api/auth/register contract', () => {
        it('should strictly reject payloads that fail shared Zod schema', async () => {
            const invalidPayload = { email: 'invalid', password: '12' };

            // Verify our shared schema catches it
            const validation = registerSchema.safeParse(invalidPayload);
            expect(validation.success).toBe(false);

            // Verify API catches it
            const res = await request(app).post('/api/auth/register').send(invalidPayload);

            expect(res.status).toBe(400);
        });
    });
});
