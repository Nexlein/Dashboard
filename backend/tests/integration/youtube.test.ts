import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../../src/utils/prisma.ts';
import { auth } from '../../src/auth.ts';
import { browser, FRONTEND, registerVerified, userByEmail } from './helpers.ts';

it('connects YouTube with offline read-only access, encrypts tokens and refreshes them', async () => {
    const agent = browser();
    const email = await registerVerified(agent);
    const subject = randomUUID();
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url === 'https://oauth2.googleapis.com/token')
            return Response.json({
                access_token: 'youtube-access',
                refresh_token: 'youtube-refresh',
                expires_in: 3600,
                token_type: 'Bearer',
            });
        if (url === 'https://openidconnect.googleapis.com/v1/userinfo')
            return Response.json({
                sub: subject,
                email: `${subject}@google.test`,
                email_verified: true,
                name: 'YouTube creator',
            });
        throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const start = await agent
        .post('/api/auth/link-social')
        .set('Origin', FRONTEND)
        .send({
            provider: 'youtube-service',
            callbackURL: `${FRONTEND}/services?linked=youtube`,
            errorCallbackURL: `${FRONTEND}/services`,
            disableRedirect: true,
        })
        .expect(200);
    const url = new URL(start.body.url);
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('scope')).toContain(
        'https://www.googleapis.com/auth/youtube.readonly',
    );
    expect(url.searchParams.get('prompt')).toBe('select_account consent');
    expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:8080/api/auth/callback/youtube-service',
    );
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    const callback = await agent
        .get('/api/auth/callback/youtube-service')
        .query({ code: 'code', state: url.searchParams.get('state') });
    expect(callback.headers.location).toBe(`${FRONTEND}/services?linked=youtube`);
    const user = await userByEmail(email);
    const account = user!.accounts.find((account) => account.providerId === 'youtube-service')!;
    expect(account.accountId).toBe(subject);
    expect(account.accessToken).toBeTruthy();
    expect(account.accessToken).not.toContain('youtube-access');
    expect(account.refreshToken).not.toContain('youtube-refresh');
    await prisma.account.update({
        where: { id: account.id },
        data: { accessTokenExpiresAt: new Date(0) },
    });
    fetchMock.mockImplementation(async () =>
        Response.json({ access_token: 'renewed-access', expires_in: 3600, token_type: 'Bearer' }),
    );
    const renewed = await auth.api.getAccessToken({
        body: { accountId: String(account.id), userId: String(user!.id) },
    });
    expect(renewed.accessToken).toBe('renewed-access');
    await agent
        .delete(`/services/youtube/accounts/${account.id}`)
        .set('Origin', FRONTEND)
        .expect(204);
    expect(await prisma.account.findUnique({ where: { id: account.id } })).toBeNull();
});

it('does not allow YouTube service accounts to sign in or link without a session', async () => {
    const agent = browser();
    await agent
        .post('/api/auth/sign-in/social')
        .set('Origin', FRONTEND)
        .send({ provider: 'youtube-service', callbackURL: FRONTEND })
        .expect(400);
    await agent
        .post('/api/auth/link-social')
        .set('Origin', FRONTEND)
        .send({ provider: 'youtube-service', callbackURL: FRONTEND })
        .expect(401);
});

it('rejects an OAuth callback arriving in a different browser', async () => {
    const agent = browser();
    await registerVerified(agent);
    const start = await agent
        .post('/api/auth/link-social')
        .set('Origin', FRONTEND)
        .send({
            provider: 'youtube-service',
            callbackURL: `${FRONTEND}/services`,
            disableRedirect: true,
        })
        .expect(200);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const callback = await browser()
        .get('/api/auth/callback/youtube-service')
        .query({ code: 'code', state: new URL(start.body.url).searchParams.get('state') });
    expect(String(callback.headers.location)).toContain('error=');
    expect(fetchMock).not.toHaveBeenCalled();
});
