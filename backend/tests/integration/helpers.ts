import { randomInt, randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import { expect, vi } from 'vitest';
import app from '../../src/app.ts';
import { sendMail } from '../../src/utils/mailer.ts';
import prisma from '../../src/utils/prisma.ts';

export const FRONTEND = 'http://localhost:5173';
export const GITHUB_SERVICE = 'github-service';
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

/** The emails captured for `to` (tests/integration/setup.ts mocks the mailer). */
export function mailsTo(to: string) {
    return vi
        .mocked(sendMail)
        .mock.calls.map(([mail]) => mail)
        .filter((mail) => mail.to === to.toLowerCase());
}

/** The one-time code of the last email sent to `to`. */
export function lastCode(to: string): string {
    const code = /\b(\d{6})\b/.exec(mailsTo(to).at(-1)?.text ?? '')?.[1];
    if (!code) throw new Error(`No code was emailed to ${to}`);
    return code;
}

export function verifyEmail(agent: Browser, email: string, otp = lastCode(email)) {
    return agent
        .post('/api/auth/email-otp/verify-email')
        .set('Origin', FRONTEND)
        .send({ email, otp });
}

/** Registers, enters the emailed code (which signs in) and returns the email. */
export async function registerVerified(agent: Browser, body: Record<string, unknown> = {}) {
    const email = String(body.email ?? uniqueEmail());
    expect((await signUp(agent, { ...body, email })).status).toBe(200);
    const res = await verifyEmail(agent, email);
    expect(res.status, res.text).toBe(200);
    return email;
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
// Every account the fake GitHub has issued a token for: /user answers for the token's owner.
const githubAccounts = new Map<string, GitHubProfile>();

export function fakeGitHub(profile: GitHubProfile) {
    const accessToken = `gho_${randomUUID()}`;
    githubAccounts.set(accessToken, profile);
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
            const owner =
                githubAccounts.get(authorization?.replace(/^Bearer /i, '') ?? '') ?? profile;
            if (url === 'https://api.github.com/user')
                return Response.json({
                    id: owner.id,
                    login: `octo-${owner.id}`,
                    name: null,
                    email: null,
                    avatar_url: 'https://avatars.githubusercontent.com/u/1',
                });
            if (url === 'https://api.github.com/user/emails')
                return Response.json([
                    { email: owner.email, primary: true, verified: owner.verified ?? true },
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
    const authorizeUrl = new URL(start.body.url);
    const state = authorizeUrl.searchParams.get('state');
    // GitHub sends the browser back to the redirect_uri of the flow (sign-in or service).
    const callbackPath = new URL(authorizeUrl.searchParams.get('redirect_uri')!).pathname;
    const callback = await agent.get(callbackPath).query({ code: 'code', state });
    return { start, callback, location: String(callback.headers.location ?? '') };
}

/** Connects a GitHub account to the GitHub service (Services page), as `agent`'s user. */
export async function connectGitHubService(agent: Browser, profile = githubProfile()) {
    const github = fakeGitHub(profile);
    const flow = await githubFlow(agent, {
        path: '/api/auth/link-social',
        body: { provider: GITHUB_SERVICE, callbackURL: `${FRONTEND}/services?linked=github` },
    });
    const account = await prisma.account.findFirst({
        where: { providerId: GITHUB_SERVICE, accountId: String(profile.id) },
    });
    return { github, flow, profile, account: account! };
}
