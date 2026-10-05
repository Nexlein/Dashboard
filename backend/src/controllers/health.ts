import prisma from '../utils/prisma.ts';

export const checkHealth = async (req, res) => {
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
