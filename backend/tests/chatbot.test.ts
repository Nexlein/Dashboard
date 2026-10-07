import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.ts';
import { FRONTEND, signedInAs, stubFetch } from './helpers.ts';

beforeEach(() => {
    vi.clearAllMocks();
    signedInAs(1);
});

describe('Ollama model API', () => {
    it('lists provider models for the signed-in user', async () => {
        const models = { models: [{ name: 'llama3:latest' }] };
        const fetch = stubFetch().mockResolvedValue(Response.json(models));
        const res = await request(app).get('/chatbot/models');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(models);
        expect(fetch).toHaveBeenCalledExactlyOnceWith('http://ollama:11434/api/tags');
    });

    it('returns the model-list failure code with the provider status', async () => {
        stubFetch().mockResolvedValue(new Response(null, { status: 503 }));
        const res = await request(app).get('/chatbot/models');
        expect(res.status).toBe(503);
        expect(res.body).toEqual({
            error: 'Failed to fetch models from Ollama',
            code: 'OLLAMA_MODELS_FAILED',
        });
    });

    it('rejects a missing model before contacting Ollama', async () => {
        const fetch = stubFetch();
        const res = await request(app).post('/chatbot/pull').set('Origin', FRONTEND).send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Model name is required', code: 'MODEL_REQUIRED' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('returns a stable pull failure when the provider response is not JSON', async () => {
        stubFetch().mockResolvedValue(new Response('Unavailable', { status: 503 }));
        const res = await request(app)
            .post('/chatbot/pull')
            .set('Origin', FRONTEND)
            .send({ model: 'llama3' });
        expect(res.status).toBe(503);
        expect(res.body).toEqual({ error: 'Failed to pull model', code: 'MODEL_PULL_FAILED' });
    });

    it('preserves a provider diagnostic with the explicit model-pull code', async () => {
        stubFetch().mockResolvedValue(
            Response.json({ error: 'Model not available at provider' }, { status: 404 }),
        );
        const res = await request(app)
            .post('/chatbot/pull')
            .set('Origin', FRONTEND)
            .send({ model: 'missing' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: 'Model not available at provider',
            code: 'MODEL_PULL_FAILED',
        });
    });

    it('requests a non-streaming model pull and returns its success', async () => {
        const fetch = stubFetch().mockResolvedValue(Response.json({ status: 'success' }));
        const res = await request(app)
            .post('/chatbot/pull')
            .set('Origin', FRONTEND)
            .send({ model: 'llama3' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, message: 'Model llama3 pulled successfully' });
        expect(fetch).toHaveBeenCalledWith('http://ollama:11434/api/pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"name":"llama3","stream":false}',
        });
    });
});
