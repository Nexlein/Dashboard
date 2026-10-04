const { PrismaClient } = require('@prisma/client');

// One client (and connection pool) per process; every module imports this instance.
module.exports = new PrismaClient();
