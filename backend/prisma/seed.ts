// First import: loads backend/.env and validates it, like the server (src/utils/env.ts).
import '../src/utils/env.ts';
import { DEMO_ACCOUNTS, seedDemoData } from '../src/utils/demoData.ts';
import prisma from '../src/utils/prisma.ts';

// `npx prisma db seed`: deletes the demo accounts and creates them again with their widgets.
// The server creates the missing ones by itself at startup when SEED_DEMO_DATA=true.
seedDemoData({ reset: true })
    .then(() => {
        for (const { email, password, role } of DEMO_ACCOUNTS)
            console.log(`✅ ${role === 'admin' ? 'Admin' : 'User'}: ${email} / ${password}`);
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
