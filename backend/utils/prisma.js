import { PrismaClient } from '@prisma/client';

// One client (and connection pool) per process; every module imports this instance.
export default new PrismaClient();
