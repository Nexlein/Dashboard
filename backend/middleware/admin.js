import prisma from '../utils/prisma.js';

async function requireAdmin(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { isAdmin: true },
        });

        if (!user?.isAdmin) {
            return res.status(403).json({ error: 'Administrator access required' });
        }

        next();
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export default requireAdmin;
