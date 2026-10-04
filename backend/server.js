const app = require('./app');
const { PORT } = require('./utils/env');
const prisma = require('./utils/prisma');
const { migrateOAuthTokens } = require('./utils/migrateOAuthTokens');

migrateOAuthTokens(prisma)
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch((err) => {
        console.error(
            'OAuth token migration failed; server not started. Check database and encryption key.',
            err,
        );
        process.exit(1);
    });
