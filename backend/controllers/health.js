const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.checkHealth = async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch {
        res.status(503).json({ status: 'error', message: 'Database connection failed' });
    }
};
