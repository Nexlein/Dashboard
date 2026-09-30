const express = require('express');
const prisma = require('../utils/prisma');
const asyncHandler = require('../middleware/asyncHandler');
const router = express.Router();

router.get(
    '/',
    asyncHandler(async (req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.status(200).json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            });
        } catch {
            const err = new Error('Database connection failed');
            err.statusCode = 503;
            throw err;
        }
    }),
);

module.exports = router;
