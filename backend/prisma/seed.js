const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const path = require('node:path');

// Manually load dotenv so we can access JWT_SECRET / ENCRYPTION_KEY when seeding
require('dotenv').config({
    path: path.join(__dirname, '../.env'),
});

const { encryptParams } = require('../utils/encryption');

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
            widgetName: 'weather-current',
            params: encryptParams({ city: 'Paris' }),
            refreshRate: 300, // 5 minutes
            layout: { x: 0, y: 0, w: 4, h: 2 },
        },
    });

    await prisma.widgetConfig.create({
        data: {
            userId: user.id,
            serviceName: 'github',
            widgetName: 'github-repo',
            params: encryptParams({ repo: 'facebook/react' }),
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
