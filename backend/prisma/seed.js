import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'node:path';

import dotenv from 'dotenv';

// Load backend/.env for JWT_SECRET / ENCRYPTION_KEY when seeding.
dotenv.config({ path: path.join(import.meta.dirname, '../.env'), quiet: true });

import { encryptJson } from '../utils/encryption.js';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create Admin User
    const adminHash = await bcrypt.hash('admin', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@dashboard.local' },
        update: { isAdmin: true, password: adminHash },
        create: {
            email: 'admin@dashboard.local',
            displayName: 'Admin Master',
            password: adminHash,
            isAdmin: true,
            cguAcceptedAt: new Date(),
        },
    });
    console.log(`✅ Admin created: ${admin.email} / admin`);

    // 2. Create Regular User
    const userHash = await bcrypt.hash('user', 10);
    const user = await prisma.user.upsert({
        where: { email: 'user@dashboard.local' },
        update: { password: userHash },
        create: {
            email: 'user@dashboard.local',
            displayName: 'John Doe',
            password: userHash,
            isAdmin: false,
            cguAcceptedAt: new Date(),
        },
    });
    console.log(`✅ User created: ${user.email} / user`);

    // 3. Clear existing widgets for the regular user to prevent duplicates on re-seed
    await prisma.widgetConfig.deleteMany({
        where: { userId: user.id },
    });

    // 4. Create Fake Widgets for Regular User
    await prisma.widgetConfig.create({
        data: {
            userId: user.id,
            serviceName: 'weather',
            widgetName: 'current_weather',
            params: encryptJson({ city: 'Paris' }),
            refreshRate: 300, // 5 minutes
            layout: { x: 0, y: 0, w: 4, h: 2 },
        },
    });

    await prisma.widgetConfig.create({
        data: {
            userId: user.id,
            serviceName: 'github',
            widgetName: 'github-repo',
            params: encryptJson({ repo: 'facebook/react' }),
            refreshRate: 3600, // 1 hour
            layout: { x: 4, y: 0, w: 4, h: 2 },
        },
    });

    console.log(`✅ Widgets added for ${user.email}`);
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
