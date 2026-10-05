import { randomInt, randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import { vi } from 'vitest';
import app from '../../src/app.ts';
import prisma from '../../src/utils/prisma.ts';

export const FRONTEND = 'http://localhost:5173';
export const PASSWORD = 'correct-horse-battery';

/** A browser: keeps the cookies the API sets, like the real frontend. */
export function browser() {
    return request.agent(app);
}
export type Browser = ReturnType<typeof browser>;

export const uniqueEmail = () => `${randomUUID()}@integration.test`;

export function signUp(agent: Browser, body: Record<string, unknown> = {}) {
    return agent
        .post('/api/auth/sign-up/email')
        .set('Origin', FRONTEND)
        .send({
            email: uniqueEmail(),
            password: PASSWORD,
            name: 'Ada',
            cguAccepted: true,
            is16OrOlder: true,
            ...body,
        });
}

export function signIn(agent: Browser, email: string, password = PASSWORD) {
    return agent.post('/api/auth/sign-in/email').set('Origin', FRONTEND).send({ email, password });
}

/** The `dashboard.session_token` Set-Cookie header of a response, if any. */
export function sessionCookie(res: Response): string | undefined {
    const header: unknown = res.headers['set-cookie'];
    const cookies = Array.isArray(header) ? (header as string[]) : [];
    return cookies.find((c) => c.startsWith('dashboard.session_token='));
}

export async function userByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { accounts: true } });
}

export type GitHubProfile = { id: number; email: string; verified?: boolean };

/** A GitHub account for the OAuth tests (fresh id and email unless given). */
export function githubProfile(overrides: Partial<GitHubProfile> = {}): GitHubProfile {
    return { id: randomInt(1, 2 ** 31), email: uniqueEmail(), verified: true, ...overrides };
}

/**
 * Replaces fetch with a fake GitHub (token exchange, profile, emails, repositories) for the
 * current test, and records the requests. Anything else fails the test.
 */
export function fakeGitHub(profile: GitHubProfile) {
    const accessToken = `gho_${randomUUID()}`;
    const requests: { url: string; authorization: string | null }[] = [];
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : String(input);
            const authorization = new Headers(init?.headers).get('authorization');
            requests.push({ url, authorization });
            if (url.startsWith('https://github.com/login/oauth/access_token'))
                return Response.json({
                    access_token: accessToken,
                    token_type: 'bearer',
                    scope: 'repo,read:user,user:email',
                });
            if (url === 'https://api.github.com/user')
                return Response.json({
                    id: profile.id,
                    login: `octo-${profile.id}`,
                    name: null,
                    email: null,
                    avatar_url: 'https://avatars.githubusercontent.com/u/1',
                });
            if (url === 'https://api.github.com/user/emails')
                return Response.json([
                    { email: profile.email, primary: true, verified: profile.verified ?? true },
                ]);
            if (url.startsWith('https://api.github.com/repos/'))
                return Response.json({
                    stargazers_count: 7,
                    forks_count: 1,
                    open_issues_count: 0,
                    full_name: 'octo/repo',
                    description: null,
                });
            throw new Error(`Unexpected request in integration test: ${url}`);
        }),
    );
    return { accessToken, requests };
}

type OAuthStart = {
    path: '/api/auth/sign-in/social' | '/api/auth/link-social';
    body?: Record<string, unknown>;
};

/**
 * Runs a GitHub OAuth flow in `agent`: starts it like the frontend, then lands on the callback
 * as GitHub would. Returns the final redirect location.
 */
export async function githubFlow(agent: Browser, { path, body = {} }: OAuthStart) {
    const start = await agent
        .post(path)
        .set('Origin', FRONTEND)
        .send({
            provider: 'github',
            callbackURL: `${FRONTEND}/`,
            errorCallbackURL: `${FRONTEND}/login`,
            disableRedirect: true,
            ...body,
        });
    if (start.status !== 200) throw new Error(`OAuth start failed: ${start.status} ${start.text}`);
    const state = new URL(start.body.url).searchParams.get('state');
    const callback = await agent.get('/api/auth/callback/github').query({ code: 'code', state });
    return { start, callback, location: String(callback.headers.location ?? '') };
}
