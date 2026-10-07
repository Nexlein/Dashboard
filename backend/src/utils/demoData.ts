import { auth } from '../auth.ts';
import { encryptJson } from './encryption.ts';
import prisma from './prisma.ts';

type DemoWidget = {
    serviceName: string;
    widgetName: string;
    params: Record<string, unknown>;
    refreshRate: number;
    layout: { x: number; y: number; w: number; h: number };
};

type DemoAccount = {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'user';
    widgets: DemoWidget[];
};

// Known passwords: these accounts exist for grading and demos only (SEED_DEMO_DATA).
export const DEMO_ACCOUNTS: DemoAccount[] = [
    {
        email: 'admin@dashboard.local',
        password: 'admin1234',
        name: 'Admin Master',
        role: 'admin',
        widgets: [],
    },
    {
        email: 'user@dashboard.local',
        password: 'user1234',
        name: 'John Doe',
        role: 'user',
        // The YouTube widgets work at once; weather and GitHub show how to connect a service.
        widgets: [
            {
                serviceName: 'youtube',
                widgetName: 'channel_watch',
                params: { channels: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' },
                refreshRate: 600,
                layout: { x: 0, y: 0, w: 5, h: 5 },
            },
            {
                serviceName: 'youtube',
                widgetName: 'video_player',
                params: { video_url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE' },
                refreshRate: 60,
                layout: { x: 5, y: 0, w: 4, h: 4 },
            },
            {
                serviceName: 'weather',
                widgetName: 'current_weather',
                params: { city: 'Paris' },
                refreshRate: 300,
                layout: { x: 9, y: 0, w: 3, h: 2 },
            },
            {
                serviceName: 'github',
                widgetName: 'repo_stats',
                params: { owner: 'facebook', repo: 'react' },
                refreshRate: 3600,
                layout: { x: 9, y: 2, w: 3, h: 2 },
            },
        ],
    },
];

// Any constant: every replica asks PostgreSQL for this lock before seeding.
const SEED_LOCK = 802_413;

/**
 * Creates the demo accounts that do not exist yet, each with its widgets, and leaves existing
 * ones untouched (so restarts keep their changes). With `reset`, deletes them first.
 *
 * The accounts are created like a sign-up (Better Auth hashes the password) but already
 * verified, without sending a code, with the CGU and age declarations recorded. Replicas that
 * start together wait for each other on a database lock, so each account is created once.
 */
export async function seedDemoData({ reset = false } = {}): Promise<string[]> {
    const context = await auth.$context;
    return prisma.$transaction(
        async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SEED_LOCK})`;
            if (reset) {
                await tx.user.deleteMany({
                    where: { email: { in: DEMO_ACCOUNTS.map((account) => account.email) } },
                });
            }

            const created: string[] = [];
            for (const account of DEMO_ACCOUNTS) {
                if (await tx.user.findUnique({ where: { email: account.email } })) continue;

                const user = await tx.user.create({
                    data: {
                        email: account.email,
                        name: account.name,
                        role: account.role,
                        emailVerified: true,
                        cguAcceptedAt: new Date(),
                    },
                });
                await tx.account.create({
                    data: {
                        userId: user.id,
                        providerId: 'credential',
                        accountId: String(user.id),
                        password: await context.password.hash(account.password),
                    },
                });
                await tx.widgetConfig.createMany({
                    data: account.widgets.map((widget) => ({
                        userId: user.id,
                        serviceName: widget.serviceName,
                        widgetName: widget.widgetName,
                        params: encryptJson(widget.params),
                        refreshRate: widget.refreshRate,
                        layout: widget.layout,
                    })),
                });
                created.push(account.email);
            }
            return created;
        },
        // Password hashing takes a moment per account.
        { timeout: 30_000 },
    );
}
