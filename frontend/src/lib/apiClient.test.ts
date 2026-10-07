import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchClient } from './apiClient';

afterEach(() => vi.unstubAllGlobals());

describe('API transport contract', () => {
    it('sends the session cookie and JSON payload while preserving caller headers', async () => {
        const fetch = vi.fn().mockResolvedValue(Response.json({ id: 42 }));
        vi.stubGlobal('fetch', fetch);
        await expect(
            fetchClient('/widgets', {
                method: 'POST',
                body: JSON.stringify({ widgetName: 'ai_chat' }),
                headers: { 'X-Request-ID': 'test' },
            }),
        ).resolves.toEqual({ id: 42 });
        expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/widgets$/), {
            method: 'POST',
            body: '{"widgetName":"ai_chat"}',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'test' },
        });
    });

    it('preserves a stable provider code, HTTP status and body retry delay', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                Response.json(
                    {
                        error: 'Provider cooldown',
                        code: 'STOCK_CREDITS_PENDING',
                        retryAfter: 45,
                    },
                    { status: 429, headers: { 'Retry-After': '60' } },
                ),
            ),
        );
        await expect(fetchClient('/widgets/1/data')).rejects.toMatchObject({
            message: 'Provider cooldown',
            status: 429,
            code: 'STOCK_CREDITS_PENDING',
            retryAfter: 45,
        });
    });

    it('uses Retry-After with an older API response that has no code or body delay', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                Response.json(
                    { error: 'Try later' },
                    {
                        status: 503,
                        headers: { 'Retry-After': '30' },
                    },
                ),
            ),
        );
        await expect(fetchClient('/widgets/1/data')).rejects.toMatchObject({
            message: 'Try later',
            status: 503,
            code: undefined,
            retryAfter: 30,
        });
    });

    it.each(['0', '-1', 'invalid'])(
        'does not schedule a retry for an invalid delay %s',
        async (delay) => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue(
                    Response.json(
                        { error: 'Try later', code: { invalid: true } },
                        {
                            status: 429,
                            headers: { 'Retry-After': delay },
                        },
                    ),
                ),
            );
            await expect(fetchClient('/widgets/1/data')).rejects.toMatchObject({
                retryAfter: undefined,
                code: undefined,
            });
        },
    );

    it('keeps the HTTP failure usable when a reverse proxy sends HTML instead of JSON', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>', { status: 502 })),
        );
        await expect(fetchClient('/widgets')).rejects.toMatchObject({
            message: 'Request failed with status 502',
            status: 502,
        });
    });

    it('accepts an empty successful response after deleting a widget', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        await expect(fetchClient('/widgets/1', { method: 'DELETE' })).resolves.toEqual({});
    });

    it('identifies network failures separately from HTTP and authentication errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Connection refused')));
        await expect(fetchClient('/widgets')).rejects.toBeInstanceOf(ApiError);
        await expect(fetchClient('/widgets')).rejects.toMatchObject({
            status: 0,
            code: 'NETWORK_ERROR',
        });
    });

    it('keeps a cancelled request as an AbortError rather than a displayed network failure', async () => {
        const aborted = new DOMException('Cancelled', 'AbortError');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(aborted));
        await expect(fetchClient('/widgets')).rejects.toBe(aborted);
    });
});
