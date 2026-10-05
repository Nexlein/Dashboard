import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// The CLI no longer reads .env by itself; Docker and CI pass real environment variables.
dotenv.config({ path: path.join(import.meta.dirname, '.env'), quiet: true });

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'node prisma/seed.ts',
    },
    datasource: {
        // `prisma generate` needs no database, so a missing URL only fails commands that connect.
        url: process.env.DATABASE_URL ?? '',
    },
});
