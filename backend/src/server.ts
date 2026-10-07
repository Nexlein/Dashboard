import _env from './utils/env.ts';
import app from './app.ts';
import { DEMO_ACCOUNTS, seedDemoData } from './utils/demoData.ts';
const { PORT, SEED_DEMO_DATA } = _env;

if (SEED_DEMO_DATA) {
    // A failed seed must not keep the API down: log it and start anyway.
    try {
        const created = await seedDemoData();
        console.log(
            created.length
                ? `Demo accounts created: ${created.join(', ')}`
                : 'Demo accounts already present',
        );
        console.warn(
            `SEED_DEMO_DATA is on: ${DEMO_ACCOUNTS.map((a) => `${a.email} / ${a.password}`).join(', ')} can sign in. Turn it off on a real deployment.`,
        );
    } catch (error) {
        console.error('Demo data seeding failed:', error);
    }
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
