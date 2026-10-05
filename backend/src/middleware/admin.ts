import type { NextFunction, Request, Response } from 'express';
import prisma from '../utils/prisma.ts';
import { authUser } from './auth.ts';

/** Runs after requireAuth: lets only administrators through. */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: authUser(req).userId },
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
