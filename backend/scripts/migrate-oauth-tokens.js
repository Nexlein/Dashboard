require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { migrateOAuthTokens } = require('../utils/migrateOAuthTokens');
const prisma = new PrismaClient();

migrateOAuthTokens(prisma)
    .then((count) => console.log(`Migrated ${count} OAuth token rows.`))
    .catch(() => {
        console.error(
            'OAuth token migration failed. Check the database and encryption key before retrying.',
        );
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
