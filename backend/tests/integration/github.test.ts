import { describe, it, expect, vi } from 'vitest';
import prisma from '../../src/utils/prisma.ts';
import { encryptJson } from '../../src/utils/encryption.ts';
import {
    FRONTEND,
    GITHUB_SERVICE,
    browser,
    connectGitHubService,
    lastCode,
    fakeGitHub,
    githubFlow,
    githubProfile,
    registerVerified,
    sessionCookie,
    signUp,
    uniqueEmail,
    userByEmail,
} from './helpers.ts';

const REGISTRATION = {
    requestSignUp: true,
    additionalData: { cguAccepted: true, is16OrOlder: true },
};

describe('GitHub sign-up', () => {
    it('cannot create an account from the sign-in page', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);

        const { location } = await githubFlow(browser(), { path: '/api/auth/sign-in/social' });

        expect(location).toBe(`${FRONTEND}/login?error=signup_disabled`);
        expect(await userByEmail(profile.email)).toBeNull();
    });

    it.each([
        [{ requestSignUp: true }, 'REGISTRATION_REQUIREMENTS'],
        [
            { requestSignUp: true, additionalData: { cguAccepted: true, is16OrOlder: false } },
            'REGISTRATION_REQUIREMENTS',
        ],
    ])('requires the CGU and age declarations (%o)', async (body, code) => {
        const profile = githubProfile();
        fakeGitHub(profile);

        const { location } = await githubFlow(browser(), {
            path: '/api/auth/sign-in/social',
            body,
        });

        expect(new URL(location).searchParams.get('error')).toBe(code);
        expect(await userByEmail(profile.email)).toBeNull();
    });

    it('refuses a GitHub account whose email is not verified', async () => {
        const profile = githubProfile({ verified: false });
        fakeGitHub(profile);

        const { location } = await githubFlow(browser(), {
            path: '/api/auth/sign-in/social',
            body: REGISTRATION,
        });

        expect(new URL(location).searchParams.get('error')).toBe('EMAIL_NOT_VERIFIED');
        expect(await userByEmail(profile.email)).toBeNull();
    });

    it('creates the account, signs in and stores the GitHub token encrypted', async () => {
        const profile = githubProfile();
        const github = fakeGitHub(profile);
        const agent = browser();

        const { callback, location } = await githubFlow(agent, {
            path: '/api/auth/sign-in/social',
            body: REGISTRATION,
        });

        expect(location).toBe(`${FRONTEND}/`);
        expect(sessionCookie(callback)).toMatch(/HttpOnly/);
        const user = await userByEmail(profile.email);
        expect(user!.cguAcceptedAt).toBeInstanceOf(Date);
        expect(user!.emailVerified).toBe(true);
        const account = user!.accounts.find((a) => a.providerId === 'github')!;
        expect(account.accountId).toBe(String(profile.id));
        expect(account.accessToken).toBeTruthy();
        expect(account.accessToken).not.toContain(github.accessToken);
        expect((await agent.get('/api/auth/get-session')).body.user.email).toBe(profile.email);
    });

    it('only finishes in the browser that started it', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);
        const start = await browser()
            .post('/api/auth/sign-in/social')
            .set('Origin', FRONTEND)
            .send({
                provider: 'github',
                callbackURL: `${FRONTEND}/`,
                errorCallbackURL: `${FRONTEND}/login`,
                disableRedirect: true,
                ...REGISTRATION,
            });
        const state = new URL(start.body.url).searchParams.get('state');

        // Another browser, without the state cookie, lands on the callback.
        const callback = await browser()
            .get('/api/auth/callback/github')
            .query({ code: 'code', state });

        expect(String(callback.headers.location)).toContain('error=');
        expect(sessionCookie(callback)).toBeUndefined();
        expect(await userByEmail(profile.email)).toBeNull();
    });
});

describe('GitHub callback failures', () => {
    async function started() {
        const agent = browser();
        const start = await agent
            .post('/api/auth/sign-in/social')
            .set('Origin', FRONTEND)
            .send({
                provider: 'github',
                callbackURL: `${FRONTEND}/`,
                errorCallbackURL: `${FRONTEND}/login`,
                disableRedirect: true,
                ...REGISTRATION,
            });
        return { agent, state: new URL(start.body.url).searchParams.get('state') };
    }

    it('handles a refusal on GitHub without exchanging a code', async () => {
        const github = fakeGitHub(githubProfile());
        const { agent, state } = await started();

        const callback = await agent
            .get('/api/auth/callback/github')
            .query({ error: 'access_denied', state });

        expect(String(callback.headers.location)).toBe(`${FRONTEND}/login?error=access_denied`);
        expect(github.requests).toEqual([]);
        expect(sessionCookie(callback)).toBeUndefined();
    });

    it('creates nothing when the code exchange fails', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);
        vi.mocked(fetch).mockImplementationOnce(async () =>
            Response.json({ error: 'bad_verification_code' }),
        );
        const { agent, state } = await started();

        const callback = await agent.get('/api/auth/callback/github').query({ code: 'x', state });

        expect(String(callback.headers.location)).toContain(`${FRONTEND}/login?error=`);
        expect(await userByEmail(profile.email)).toBeNull();
    });

    it('accepts a state only once', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);
        const { agent, state } = await started();

        const first = await agent.get('/api/auth/callback/github').query({ code: 'x', state });
        expect(String(first.headers.location)).toBe(`${FRONTEND}/`);

        const replay = await agent.get('/api/auth/callback/github').query({ code: 'x', state });
        expect(String(replay.headers.location)).toContain('error=');
        expect(await prisma.user.count({ where: { email: profile.email } })).toBe(1);
    });
});

describe('GitHub sign-in', () => {
    it('signs back in to the same account after its email changed', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);
        const first = browser();
        await githubFlow(first, { path: '/api/auth/sign-in/social', body: REGISTRATION });
        const user = await userByEmail(profile.email);
        const newEmail = uniqueEmail();
        await first
            .post('/api/auth/email-otp/request-email-change')
            .set('Origin', FRONTEND)
            .send({ newEmail });
        const change = await first
            .post('/api/auth/email-otp/change-email')
            .set('Origin', FRONTEND)
            .send({ newEmail, otp: lastCode(newEmail) });
        expect(change.status).toBe(200);

        const again = browser();
        const { location } = await githubFlow(again, { path: '/api/auth/sign-in/social' });

        expect(location).toBe(`${FRONTEND}/`);
        expect((await again.get('/api/auth/get-session')).body.user.id).toBe(String(user!.id));
        expect(await userByEmail(profile.email)).toBeNull();
    });

    it('signs a verified email account in when GitHub verified the same email', async () => {
        const email = await registerVerified(browser());
        fakeGitHub(githubProfile({ email }));
        const agent = browser();

        const { location } = await githubFlow(agent, { path: '/api/auth/sign-in/social' });

        expect(location).toBe(`${FRONTEND}/`);
        const user = await userByEmail(email);
        expect(user!.accounts.map((a) => a.providerId).sort()).toEqual(['credential', 'github']);
        expect(await prisma.user.count({ where: { email } })).toBe(1);
    });

    it('does not sign in to an email account that was never verified, even with a matching GitHub email', async () => {
        // Whoever registered that address with a password could be someone else
        // (pre-registration takeover): link GitHub from the account instead.
        const email = uniqueEmail();
        await signUp(browser(), { email });
        fakeGitHub(githubProfile({ email }));

        const { location } = await githubFlow(browser(), { path: '/api/auth/sign-in/social' });

        expect(location).toBe(`${FRONTEND}/login?error=account_not_linked`);
        const user = await userByEmail(email);
        expect(user!.accounts.map((a) => a.providerId)).toEqual(['credential']);
    });

    it('does not take over an email account when GitHub did not verify that email', async () => {
        const email = await registerVerified(browser());
        fakeGitHub(githubProfile({ email, verified: false }));

        const { location } = await githubFlow(browser(), { path: '/api/auth/sign-in/social' });

        expect(location).toContain('error=');
        const user = await userByEmail(email);
        expect(user!.accounts.map((a) => a.providerId)).toEqual(['credential']);
    });
});

describe('GitHub as a service, apart from GitHub sign-in', () => {
    async function emailAccount() {
        const agent = browser();
        const email = await registerVerified(agent);
        return { agent, email, user: (await userByEmail(email))! };
    }

    type ListedService = { name: string; connected: boolean; accounts?: unknown[] };
    const githubService = (body: ListedService[]) => body.find((s) => s.name === 'github')!;

    function repoWidget(userId: number, params: Record<string, unknown>) {
        return prisma.widgetConfig.create({
            data: {
                userId,
                serviceName: 'github',
                widgetName: 'repo_stats',
                params: encryptJson({ owner: 'octo', repo: 'repo', ...params }),
                refreshRate: 60,
                layout: { x: 0, y: 0, w: 2, h: 2 },
            },
        });
    }

    it('signs in with GitHub for identity only: no repository access, service not connected', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);
        const agent = browser();

        const { start } = await githubFlow(agent, {
            path: '/api/auth/sign-in/social',
            body: REGISTRATION,
        });

        const scope = new URL(start.body.url).searchParams.get('scope')!;
        expect(scope.split(' ')).not.toContain('repo');
        expect(githubService((await agent.get('/services')).body).connected).toBe(false);
    });

    it('connects several GitHub accounts, each widget using the one it names', async () => {
        const { agent, user } = await emailAccount();
        const first = await connectGitHubService(agent);
        const second = await connectGitHubService(agent);

        expect(first.flow.location).toBe(`${FRONTEND}/services?linked=github`);
        const scope = new URL(first.flow.start.body.url).searchParams.get('scope')!;
        expect(scope.split(' ')).toContain('repo');
        const service = githubService((await agent.get('/services')).body);
        expect(service.connected).toBe(true);
        expect(service.accounts).toEqual([
            expect.objectContaining({ id: first.account.id, login: `octo-${first.profile.id}` }),
            expect.objectContaining({ id: second.account.id, login: `octo-${second.profile.id}` }),
        ]);
        expect(JSON.stringify(service)).not.toContain(first.github.accessToken);

        const widget = await repoWidget(user.id, { account: String(first.account.id) });
        const data = await agent.get(`/widgets/${widget.id}/data`);

        expect(data.status).toBe(200);
        expect(data.body.stars).toBe(7);
        // The first account's token, decrypted by Better Auth, not the second one's.
        const repoRequest = second.github.requests.find((r) => r.url.includes('/repos/octo/repo'));
        expect(repoRequest!.authorization).toBe(`Bearer ${first.github.accessToken}`);
    });

    it('asks which account to use when several are connected', async () => {
        const { agent, user } = await emailAccount();
        await connectGitHubService(agent);
        await connectGitHubService(agent);

        const res = await agent.get(`/widgets/${(await repoWidget(user.id, {})).id}/data`);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Choose which GitHub account to use');
    });

    it('uses the only connected account when the widget names none', async () => {
        const { agent, user } = await emailAccount();
        const { github } = await connectGitHubService(agent);

        const res = await agent.get(`/widgets/${(await repoWidget(user.id, {})).id}/data`);

        expect(res.status).toBe(200);
        const repoRequest = github.requests.find((r) => r.url.includes('/repos/octo/repo'));
        expect(repoRequest!.authorization).toBe(`Bearer ${github.accessToken}`);
    });

    it('reports GitHub widgets as not connected until an account is connected', async () => {
        const { agent } = await emailAccount();

        const res = await agent
            .post('/widgets')
            .set('Origin', FRONTEND)
            .send({
                serviceName: 'github',
                widgetName: 'repo_stats',
                params: { owner: 'octo', repo: 'repo' },
                refreshRate: 60,
                layout: { x: 0, y: 0, w: 2, h: 2 },
            });

        expect(res.status).toBe(409);
    });

    it('never uses an account of another user', async () => {
        const { agent, user } = await emailAccount();
        const other = await emailAccount();
        const { account } = await connectGitHubService(other.agent);
        await connectGitHubService(agent);

        const widget = await repoWidget(user.id, { account: String(account.id) });
        const res = await agent.get(`/widgets/${widget.id}/data`);

        expect(res.status).toBe(409);
        const removal = await agent
            .delete(`/services/github/accounts/${account.id}`)
            .set('Origin', FRONTEND);
        expect(removal.status).toBe(404);
        expect(await prisma.account.count({ where: { id: account.id } })).toBe(1);
    });

    it('removes one connected account, or all of them, never the GitHub sign-in', async () => {
        const profile = githubProfile();
        fakeGitHub(profile);
        const agent = browser();
        await githubFlow(agent, { path: '/api/auth/sign-in/social', body: REGISTRATION });
        const first = await connectGitHubService(agent);
        await connectGitHubService(agent);
        await connectGitHubService(agent);
        const providers = async () =>
            (await userByEmail(profile.email))!.accounts.map((a) => a.providerId).sort();

        const one = await agent
            .delete(`/services/github/accounts/${first.account.id}`)
            .set('Origin', FRONTEND);
        expect(one.status).toBe(204);
        expect(await providers()).toEqual(['github', GITHUB_SERVICE, GITHUB_SERVICE]);

        const all = await agent.delete('/services/github/connection').set('Origin', FRONTEND);
        expect(all.status).toBe(204);
        expect(await providers()).toEqual(['github']);
    });

    it('cannot sign in with a GitHub service account', async () => {
        const { agent } = await emailAccount();
        const { profile } = await connectGitHubService(agent);
        fakeGitHub(profile);

        const social = await browser()
            .post('/api/auth/sign-in/social')
            .set('Origin', FRONTEND)
            .send({ provider: GITHUB_SERVICE, callbackURL: `${FRONTEND}/`, disableRedirect: true });

        expect(social.status).toBe(400);
        expect(social.body.code).toBe('NOT_A_SIGN_IN_PROVIDER');
        expect(sessionCookie(social)).toBeUndefined();
    });

    it('does not connect one GitHub account to two Dashboard users', async () => {
        const first = await emailAccount();
        const { profile } = await connectGitHubService(first.agent);
        const second = await emailAccount();

        const { flow } = await connectGitHubService(second.agent, profile);

        expect(flow.location).toContain('error=account_already_linked_to_different_user');
        expect(
            await prisma.account.count({
                where: { userId: second.user.id, providerId: GITHUB_SERVICE },
            }),
        ).toBe(0);
    });
});

describe('tokens out of reach of page scripts', () => {
    it('no Better Auth endpoint returns the session token or the GitHub token', async () => {
        const agent = browser();
        const email = await registerVerified(agent);
        const { github } = await connectGitHubService(agent);
        const user = await userByEmail(email);
        const sessionToken = (await prisma.session.findFirst({
            where: { userId: user!.id },
            orderBy: { createdAt: 'desc' },
        }))!.token;
        const accountId = String(user!.accounts.find((a) => a.providerId === GITHUB_SERVICE)!.id);

        const post = (path: string, body: object) =>
            agent.post(`/api/auth${path}`).set('Origin', FRONTEND).send(body);
        const calls: [string, () => PromiseLike<{ text: string }>][] = [
            ['get-access-token', () => post('/get-access-token', { accountId })],
            ['refresh-token', () => post('/refresh-token', { accountId })],
            ['list-sessions', () => agent.get('/api/auth/list-sessions')],
            ['update-session', () => post('/update-session', {})],
            ['list-accounts', () => agent.get('/api/auth/list-accounts')],
            ['account-info', () => agent.get('/api/auth/account-info').query({ accountId })],
            ['get-session', () => agent.get('/api/auth/get-session')],
        ];
        for (const [path, call] of calls) {
            const { text } = await call();
            expect(text, path).not.toContain(sessionToken);
            expect(text, path).not.toContain(github.accessToken);
        }
    });
});
