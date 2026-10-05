import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import env from './env.ts';

// One client (and connection pool) per process; every module imports this instance.
export default new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
