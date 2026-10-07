import { describe, it, expect } from 'vitest';
import { sendMail } from '../../src/utils/mailer.ts';
import prisma from '../../src/utils/prisma.ts';
import { decryptJson } from '../../src/utils/encryption.ts';
import { DEMO_ACCOUNTS, seedDemoData } from '../../src/utils/demoData.ts';
import { browser, signIn, userByEmail } from './helpers.ts';

const emails = DEMO_ACCOUNTS.map((account) => account.email);
const demoUsers = () => prisma.user.findMany({ where: { email: { in: emails } } });

describe('demo data seeding', () => {
    it('creates each demo account once, even when replicas seed together', async () => {
        await seedDemoData({ reset: true });
        await prisma.user.deleteMany({ where: { email: { in: emails } } });
        const mailsBefore = (sendMail as unknown as { mock: { calls: unknown[] } }).mock.calls
            .length;

        const results = await Promise.all([seedDemoData(), seedDemoData(), seedDemoData()]);

        expect(results.flat().sort()).toEqual([...emails].sort());
        expect(await demoUsers()).toHaveLength(DEMO_ACCOUNTS.length);
        // Verified accounts: no code is emailed to these made-up addresses.
        expect((sendMail as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(
            mailsBefore,
        );
    });

    it('creates verified accounts that sign in, with their role and widgets', async () => {
        await seedDemoData({ reset: true });

        for (const account of DEMO_ACCOUNTS) {
            const user = await userByEmail(account.email);
            expect(user).toMatchObject({ role: account.role, emailVerified: true });
            expect(user!.cguAcceptedAt).not.toBeNull();
            expect((await signIn(browser(), account.email, account.password)).status).toBe(200);

            const widgets = await prisma.widgetConfig.findMany({ where: { userId: user!.id } });
            expect(widgets.map((w) => `${w.serviceName}:${w.widgetName}`).sort()).toEqual(
                account.widgets.map((w) => `${w.serviceName}:${w.widgetName}`).sort(),
            );
            for (const widget of widgets) expect(decryptJson(widget.params)).toBeTruthy();
        }
    });

    it('leaves existing demo accounts as they are on the next startup', async () => {
        await seedDemoData({ reset: true });
        const [first] = DEMO_ACCOUNTS;
        await prisma.user.update({ where: { email: first.email }, data: { name: 'Renamed' } });

        expect(await seedDemoData()).toEqual([]);

        expect(await userByEmail(first.email)).toMatchObject({ name: 'Renamed' });
        expect(await demoUsers()).toHaveLength(DEMO_ACCOUNTS.length);
    });

    it('recreates the demo accounts from scratch with reset', async () => {
        await seedDemoData({ reset: true });
        const before = await userByEmail(DEMO_ACCOUNTS[0].email);

        expect((await seedDemoData({ reset: true })).sort()).toEqual([...emails].sort());

        expect((await userByEmail(DEMO_ACCOUNTS[0].email))!.id).not.toBe(before!.id);
    });
});
