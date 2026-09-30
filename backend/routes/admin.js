const express = require('express');
const prisma = require('../utils/prisma');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
    '/users',
    asyncHandler(async (req, res) => {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                displayName: true,
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
    }),
);

router.delete(
    '/users/:id',
    asyncHandler(async (req, res) => {
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
            throw error;
        }
    }),
);

module.exports = router;
