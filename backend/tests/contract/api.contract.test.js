import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { registerSchema } from 'shared';

describe('API Contract Tests', () => {
    describe('POST /auth/register contract', () => {
        it('should strictly reject payloads that fail shared Zod schema', async () => {
            const invalidPayload = { email: 'invalid', password: '12' };

            // Verify our shared schema catches it
            const validation = registerSchema.safeParse(invalidPayload);
            expect(validation.success).toBe(false);

            // Verify API catches it
            const res = await request(app).post('/auth/register').send(invalidPayload);

            expect(res.status).toBe(400);
        });
    });
});
