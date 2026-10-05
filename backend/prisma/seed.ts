// First import: loads backend/.env and validates it, like the server (src/utils/env.ts).
import '../src/utils/env.ts';
import { auth } from '../src/auth.ts';
import prisma from '../src/utils/prisma.ts';
import { encryptJson } from '../src/utils/encryption.ts';

// Test accounts, created through Better Auth's own sign-up (same hashing and checks as the
// registration page). Re-running the seed recreates them and their widgets.
const ACCOUNTS = [
    { email: 'admin@dashboard.local', password: 'admin1234', name: 'Admin Master', role: 'admin' },
    { email: 'user@dashboard.local', password: 'user1234', name: 'John Doe', role: 'user' },
];

async function main() {
    console.log('Seeding database...');

    await prisma.user.deleteMany({ where: { email: { in: ACCOUNTS.map((a) => a.email) } } });

    const ids: Record<string, number> = {};
    for (const { email, password, name, role } of ACCOUNTS) {
        // The declarations are checked by the sign-up hook (src/auth.ts), outside Better Auth's
        // own body type: pass them through a variable.
        const body = { email, password, name, cguAccepted: true, is16OrOlder: true };
        const { user } = await auth.api.signUpEmail({ body });
        ids[email] = Number(user.id);
        await prisma.user.update({ where: { id: ids[email] }, data: { role } });
        // Sign-up also signed the account in; nobody holds that session.
        await prisma.session.deleteMany({ where: { userId: ids[email] } });
        console.log(`✅ ${role === 'admin' ? 'Admin' : 'User'} created: ${email} / ${password}`);
    }

    const userId = ids['user@dashboard.local'];
    await prisma.widgetConfig.createMany({
        data: [
            {
                userId,
                serviceName: 'weather',
                widgetName: 'current_weather',
                params: encryptJson({ city: 'Paris' }),
                refreshRate: 300,
                layout: { x: 0, y: 0, w: 4, h: 2 },
            },
            {
                userId,
                serviceName: 'github',
                widgetName: 'repo_stats',
                params: encryptJson({ owner: 'facebook', repo: 'react' }),
                refreshRate: 3600,
                layout: { x: 4, y: 0, w: 4, h: 2 },
            },
        ],
    });
    console.log('✅ Widgets added for user@dashboard.local');
    console.log('Database seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
