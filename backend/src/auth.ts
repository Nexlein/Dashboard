import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware, getOAuthState } from 'better-auth/api';
import { admin, emailOTP, genericOAuth } from 'better-auth/plugins';
import { github } from 'better-auth/social-providers';
import { profileSchema, registerSchema } from 'shared';
import env from './utils/env.ts';
import prisma from './utils/prisma.ts';
import { allowedOrigins } from './utils/origins.ts';
import { GITHUB_SERVICE_PROVIDER } from './utils/oauthProviders.ts';
import { sendOtpEmail } from './utils/otpEmails.ts';

// Authentication is Better Auth: email/password with emailed one-time codes (email verification,
// password reset, email change), GitHub sign-in and account linking, database sessions, and the
// admin plugin. It serves /api/auth/* (mounted in app.ts). This file only adds the project's own
// rules: CGU and age declarations at sign-up, profile limits, and session tokens kept out of
// JSON responses.

/** Responses that would otherwise expose the session token to page scripts. */
const TOKEN_RESPONSES = new Set([
    '/get-session',
    '/sign-in/email',
    '/sign-up/email',
    '/email-otp/verify-email',
]);

function githubServiceProvider(clientId: string, clientSecret: string) {
    // Better Auth's GitHub implementation (code exchange, profile, verified emails), under
    // another provider id.
    const githubApi = github({ clientId, clientSecret, scope: ['repo'] });
    return {
        providerId: GITHUB_SERVICE_PROVIDER,
        clientId,
        clientSecret,
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['read:user', 'user:email', 'repo'],
        // GitHub would otherwise reuse the account the browser is signed in to: show the account
        // picker, where the user can also sign in to another GitHub account to connect it.
        prompt: 'select_account' as const,
        // Connected from the Services page only: never a way to create an account.
        disableSignUp: true,
        getToken: async (data: Parameters<typeof githubApi.validateAuthorizationCode>[0]) => {
            const tokens = await githubApi.validateAuthorizationCode(data);
            // Better Auth turns this error into an error redirect, like for GitHub sign-in.
            if (!tokens) throw new Error('GitHub refused the authorization code');
            return tokens;
        },
        getUserInfo: async (tokens: Parameters<typeof githubApi.getUserInfo>[0]) => {
            const info = await githubApi.getUserInfo(tokens);
            if (!info) return null;
            return { ...info.user, id: String(info.data.id) };
        },
    };
}

const REGISTRATION_REQUIREMENTS = {
    code: 'REGISTRATION_REQUIREMENTS',
    message: 'You must accept the CGU and confirm you are 16 or older to register.',
};

/** Removes `token` from a session-like JSON body (top level and `session`). */
function withoutToken(body: Record<string, unknown>) {
    const { token: _token, ...rest } = body;
    if (rest.session && typeof rest.session === 'object') {
        const { token: _sessionToken, ...session } = rest.session as Record<string, unknown>;
        rest.session = session;
    }
    return rest;
}

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    // Frontends allowed to call /api/auth/* and to be redirected to after OAuth (CSRF check).
    trustedOrigins: allowedOrigins,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        // Sign-in waits for the emailed code: no account with a fake or mistyped address.
        requireEmailVerification: true,
        // A password reset signs every session out.
        revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
        // An unverified sign-in attempt sends a new code.
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
    },
    socialProviders:
        env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
            ? {
                  github: {
                      clientId: env.GITHUB_CLIENT_ID,
                      clientSecret: env.GITHUB_CLIENT_SECRET,
                      // Identity only (profile and email): the GitHub widgets use the accounts
                      // connected to the GitHub service (GITHUB_SERVICE_PROVIDER).
                      // The sign-in page cannot create accounts: only the registration page
                      // (requestSignUp) can, once the CGU and age boxes are checked.
                      disableImplicitSignUp: true,
                  },
              }
            : {},
    user: {
        additionalFields: {
            cguAcceptedAt: { type: 'date', required: false, input: false },
        },
        // Requires a password or a session created less than a day ago (Better Auth default).
        deleteUser: { enabled: true },
    },
    account: {
        // GitHub tokens are stored encrypted (AES-256-GCM, key derived from the secret).
        encryptOAuthTokens: true,
        // A signed-in user may link a GitHub account whose email differs from theirs.
        accountLinking: {
            enabled: true,
            allowDifferentEmails: true,
            // GitHub service accounts link even when their email is not verified: they are
            // not a way to sign in.
            trustedProviders: [GITHUB_SERVICE_PROVIDER],
        },
    },
    // utils/rateLimit.ts limits sign-in and sign-up instead (app.ts): its counters live in
    // Redis, shared by every replica, where Better Auth's default storage is per process.
    rateLimit: { enabled: false },
    // Closed over HTTP (the server keeps calling them through auth.api):
    disabledPaths: [
        // They hand a GitHub token or session tokens to the page, where an injected script
        // could take them (utils/oauthAccounts.ts reads the GitHub token server-side).
        '/get-access-token',
        '/refresh-token',
        '/list-sessions',
        // Sign-in by code is not offered (one way to sign in with an email: the password).
        '/sign-in/email-otp',
        '/forget-password/email-otp',
        // Admin plugin routes the project does not use. Administrators keep list-users,
        // get-user, remove-user, ban-user, unban-user, set-role and revoke-user-sessions.
        '/admin/impersonate-user', // act as a user
        '/admin/stop-impersonating',
        '/admin/list-user-sessions', // returns session tokens
        '/admin/revoke-user-session', // needs those tokens
        '/admin/set-user-password', // an administrator would know the password
        '/admin/create-user', // would skip the CGU and age declarations
        '/admin/update-user', // could change the email or its verification
        '/admin/has-permission',
    ],
    advanced: {
        // Better Auth skips its Origin/callback URL checks when NODE_ENV is "test": keep them
        // on everywhere, so the tests exercise the production behavior.
        disableOriginCheck: false,
        cookiePrefix: 'dashboard',
        database: { generateId: 'serial' },
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            const body = (ctx.body ?? {}) as Record<string, unknown>;
            if (
                ctx.path === '/sign-in/social' &&
                [GITHUB_SERVICE_PROVIDER].includes(String(body.provider))
            ) {
                throw APIError.from('BAD_REQUEST', {
                    code: 'NOT_A_SIGN_IN_PROVIDER',
                    message: 'Service accounts cannot be used to sign in.',
                });
            }
            if (ctx.path === '/sign-up/email') {
                const parsed = registerSchema.safeParse(body);
                if (!parsed.success) {
                    throw APIError.from('BAD_REQUEST', {
                        code: 'INVALID_REGISTRATION',
                        message: parsed.error.issues[0].message,
                    });
                }
                // Store the trimmed values the schema produced.
                return {
                    context: {
                        body: { ...body, email: parsed.data.email, name: parsed.data.name },
                    },
                };
            }
            if (ctx.path === '/update-user' && 'name' in body) {
                const parsed = profileSchema.safeParse(body);
                if (!parsed.success) {
                    throw APIError.from('BAD_REQUEST', {
                        code: 'INVALID_PROFILE',
                        message: parsed.error.issues[0].message,
                    });
                }
                return { context: { body: { ...body, name: parsed.data.name } } };
            }
            if (ctx.path === '/email-otp/send-verification-otp' && body.type === 'sign-in') {
                throw APIError.from('BAD_REQUEST', {
                    code: 'OTP_SIGN_IN_DISABLED',
                    message: 'Sign-in by code is not available.',
                });
            }
        }),
        after: createAuthMiddleware(async (ctx) => {
            if (!TOKEN_RESPONSES.has(ctx.path)) return;
            const returned = ctx.context.returned;
            if (returned && typeof returned === 'object' && !(returned instanceof Response)) {
                if (returned instanceof Error) return;
                return ctx.json(withoutToken(returned as Record<string, unknown>));
            }
        }),
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user, ctx) => {
                    const path = ctx?.path ?? '';
                    // The before hook above checked the declarations of email sign-ups.
                    if (path === '/sign-up/email') {
                        return { data: { ...user, cguAcceptedAt: new Date() } };
                    }
                    if (path.startsWith('/callback')) {
                        // Sent by the registration page through the OAuth state: the user's own
                        // declarations, like the checkboxes of the email form.
                        const state = await getOAuthState<{
                            cguAccepted?: unknown;
                            is16OrOlder?: unknown;
                        }>();
                        if (state?.cguAccepted !== true || state?.is16OrOlder !== true) {
                            throw APIError.from('FORBIDDEN', REGISTRATION_REQUIREMENTS);
                        }
                        // An unverified GitHub email could claim someone else's address.
                        if (!user.emailVerified) {
                            throw APIError.from('FORBIDDEN', {
                                code: 'EMAIL_NOT_VERIFIED',
                                message: 'Your GitHub account needs a verified email address.',
                            });
                        }
                        return { data: { ...user, cguAcceptedAt: new Date() } };
                    }
                    // Accounts created by an administrator have not accepted the CGU yet.
                },
            },
        },
    },
    plugins: [
        genericOAuth({
            config: [
                ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
                    ? [
                          githubServiceProvider(
                              env.GITHUB_SERVICE_CLIENT_ID ?? env.GITHUB_CLIENT_ID,
                              env.GITHUB_SERVICE_CLIENT_SECRET ?? env.GITHUB_CLIENT_SECRET,
                          ),
                      ]
                    : []),
            ],
        }),
        admin(),
        emailOTP({
            // Codes replace Better Auth's verification links.
            overrideDefaultEmailVerification: true,
            sendVerificationOnSignUp: true,
            // 6 digits, valid 5 minutes, 3 attempts, stored hashed (Better Auth defaults, except
            // the hashing).
            storeOTP: 'hashed',
            changeEmail: { enabled: true },
            sendVerificationOTP: async ({ email, otp, type }) => {
                // Not awaited: response times must not tell whether an address has an account.
                if (type === 'sign-in') return;
                void sendOtpEmail(email, otp, type).catch((error: unknown) =>
                    console.error('Failed to send a verification code:', error),
                );
            },
        }),
    ],
});
