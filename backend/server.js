const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const { migrateOAuthTokens } = require('./utils/migrateOAuthTokens');

const PORT = process.env.PORT || 8080;
const migrationClient = new PrismaClient();

migrateOAuthTokens(migrationClient)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((err) => {
        console.error(
            'OAuth token migration failed; server not started. Check database and encryption key.',
            err,
        );
        process.exit(1);
    })
    .finally(() => migrationClient.$disconnect());
