const githubService = require('../services/github');

jest.mock('@prisma/client', () => {
    const mPrisma = {
        oAuthToken: {
            update: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

global.fetch = jest.fn();

describe('GitHub Service', () => {
    let mockContext;

    beforeEach(() => {
        jest.clearAllMocks();
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
            await expect(githubService.execute('repo_stats', {}, {})).rejects.toThrow(
                'GitHub account is not connected',
            );
        });

        it('executes repo_stats correctly', async () => {
            global.fetch.mockResolvedValueOnce({
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

        it('executes latest_commits correctly', async () => {
            global.fetch.mockResolvedValueOnce({
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

            const result = await githubService.execute(
                'latest_commits',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );
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
            global.fetch.mockResolvedValueOnce({
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
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ stargazers_count: 10, full_name: 'test/repo' }),
            });

            await githubService.execute('repo_stats', { owner: 'test', repo: 'repo' }, mockContext);
            const result2 = await githubService.execute(
                'repo_stats',
                { owner: 'test', repo: 'repo' },
                mockContext,
            );

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(result2.stars).toBe(10);
        });
    });

    describe('Token Refreshing', () => {
        it('refreshes token on 401 and retries', async () => {
            global.fetch
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

            expect(result.stars).toBe(42);
            expect(global.fetch).toHaveBeenCalledTimes(3);
            expect(prisma.oAuthToken.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        accessToken: expect.any(String),
                        refreshToken: expect.any(String),
                    }),
                }),
            );
            expect(mockContext.credentials.accessToken).toBe('new-access-token');
        });

        it('throws appropriate error if refresh fails', async () => {
            global.fetch
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
