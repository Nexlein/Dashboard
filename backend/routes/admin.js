const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                isAdmin: true,
                cguAcceptedAt: true,
                language: true,
                theme: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.status(200).json(users);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (userId === req.user.userId) {
        return res.status(403).json({
            error: 'You cannot delete your own account',
        });
    }

    try {
        await prisma.user.delete({
            where: { id: userId },
        });

        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
