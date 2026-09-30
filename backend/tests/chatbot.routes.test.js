const request = require('supertest');
const express = require('express');
const chatbotRouter = require('../routes/chatbot');

const app = express();
app.use(express.json());
app.use('/chatbot', chatbotRouter);

const errorHandler = require('../middleware/errorHandler');
app.use(errorHandler);

global.fetch = jest.fn();

describe('Chatbot Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /chatbot/models', () => {
        test('returns models on success', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ models: [{ name: 'llama2' }] }),
            });

            const res = await request(app).get('/chatbot/models');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ models: [{ name: 'llama2' }] });
        });

        test('returns error if fetch fails (not ok)', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const res = await request(app).get('/chatbot/models');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: 'Failed to fetch models from Ollama' });
        });

        test('returns 500 on fetch exception', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const res = await request(app).get('/chatbot/models');
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Could not connect to Ollama' });
        });
    });

    describe('POST /chatbot/pull', () => {
        test('returns error if model is missing', async () => {
            const res = await request(app).post('/chatbot/pull').send({});
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'Model name is required' });
        });

        test('returns success if pull works', async () => {
            fetch.mockResolvedValueOnce({ ok: true });

            const res = await request(app).post('/chatbot/pull').send({ model: 'llama2' });
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'success' });
        });

        test('returns error if pull fetch fails (not ok)', async () => {
            fetch.mockResolvedValueOnce({ ok: false, status: 500 });

            const res = await request(app).post('/chatbot/pull').send({ model: 'llama2' });
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Failed to pull model' });
        });

        test('returns 500 on fetch exception', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const res = await request(app).post('/chatbot/pull').send({ model: 'llama2' });
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Could not connect to Ollama' });
        });
    });
});
