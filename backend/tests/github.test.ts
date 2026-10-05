import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { stubFetch } from './helpers.ts';
import { decryptString } from '../src/utils/encryption.ts';
import githubService from '../src/services/github.ts';
import type { ServiceContext } from '../src/services/types.ts';

// The shared client from utils/prisma.ts: plain stubs, hoisted for vi.mock.
const prisma = vi.hoisted(() => ({
    oAuthToken: {
        update: vi.fn(),
    },
}));
vi.mock('../src/utils/prisma.ts', () => ({ default: prisma }));

// Runs before the imports below: the app reads these when it loads.
vi.hoisted(() => {
    process.env.JWT_SECRET = 'github-service-test-secret';
});

describe('GitHub Service', () => {
    let fetchMock: Mock;
    let mockContext: ServiceContext & {
        credentials: { accessToken: string; refreshToken: string };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock = stubFetch();
        githubService.clearCache();
        process.env.GITHUB_CLIENT_ID = 'test-client';
        process.env.GITHUB_CLIENT_SECRET = 'test-secret';

        mockContext = {
            userId: 1,
            credentials: { accessToken: 'mock-access', refreshToken: 'mock-refresh' },
            refreshRate: 60,
            cacheScope: 'test',
        };
    });

    describe('Execution', () => {
        it('throws if no credentials provided', async () => {
            await expect(githubService.execute('repo_stats', {}, { userId: 1 })).rejects.toThrow(
                'GitHub account is not connected',
            );
        });

        it('executes repo_stats correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    stargazers_count: 10,
                    forks_count: 5,
                    open_issues_count: 2,
                    full_name: 'test/repo',
                    description: 'test description',
                }),
            });

            const result = await githubService.execute(
                'repo_stats',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );
            expect(result).toEqual({
                stars: 10,
                forks: 5,
                open_issues: 2,
                name: 'test/repo',
                description: 'test description',
            });
        });

        it('encodes user-supplied path segments instead of letting them change the endpoint', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ login: 'x', public_repos: 0, followers: 0, following: 0 }),
            });

            await githubService.execute(
                'user_profile',
                { username: '../user/emails' },
                mockContext,
            );

            expect(fetchMock).toHaveBeenCalledWith(
                'https://api.github.com/users/..%2Fuser%2Femails',
                expect.anything(),
            );
        });

        it('executes latest_commits correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    {
                        sha: '12345',
                        commit: { message: 'init', author: { name: 'test', date: '2026-09-21' } },
                        author: { avatar_url: 'http://avatar' },
                        html_url: 'http://commit',
                    },
                ],
            });

            const result = (await githubService.execute(
                'latest_commits',
                { owner: 'test', repo: 'repo' },
                mockContext,
            )) as unknown[];
            expect(result[0]).toEqual({
                sha: '12345',
                message: 'init',
                author: 'test',
                date: '2026-09-21',
                avatar: 'http://avatar',
                url: 'http://commit',
            });
        });

        it('executes user_profile correctly', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    login: 'testuser',
                    name: 'Test',
                    avatar_url: 'http://avatar',
                    public_repos: 10,
                    followers: 5,
                    following: 2,
                    bio: 'bio',
                }),
            });

            const result = await githubService.execute(
                'user_profile',
                { username: 'testuser' },
                mockContext,
            );
            expect(result).toEqual({
                login: 'testuser',
                name: 'Test',
                avatar_url: 'http://avatar',
                public_repos: 10,
                followers: 5,
                following: 2,
                bio: 'bio',
            });
        });
    });

    describe('Caching', () => {
        it('returns cached data if within TTL', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stargazers_count: 10, full_name: 'test/repo' }),
            });

            await githubService.execute('repo_stats', { owner: 'test', repo: 'repo' }, mockContext);
            const result2 = await githubService.execute(
                'repo_stats',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(result2).toHaveProperty('stars', 10);
        });
    });

    describe('Token Refreshing', () => {
        it('refreshes token on 401 and retries', async () => {
            fetchMock
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        access_token: 'new-access-token',
                        refresh_token: 'new-refresh-token',
                        expires_in: 3600,
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ stargazers_count: 42, full_name: 'test/repo' }),
                });

            prisma.oAuthToken.update.mockResolvedValueOnce({});

            const result = await githubService.execute(
                'repo_stats',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );

            expect(result).toHaveProperty('stars', 42);
            expect(fetchMock).toHaveBeenCalledTimes(3);
            expect(prisma.oAuthToken.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        accessToken: expect.any(String),
                        refreshToken: expect.any(String),
                    }),
                }),
            );
            expect(mockContext.credentials.accessToken).toBe('new-access-token');
            const saved = prisma.oAuthToken.update.mock.calls[0][0].data;
            expect(decryptString(saved.accessToken)).toBe('new-access-token');
            expect(decryptString(saved.refreshToken)).toBe('new-refresh-token');
        });

        it('throws appropriate error if refresh fails', async () => {
            fetchMock
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({ error: 'bad refresh' }),
                });

            await expect(
                githubService.execute('repo_stats', { owner: 'test', repo: 'repo' }, mockContext),
            ).rejects.toThrow('GitHub API error: Unauthorized');
        });
    });
});
