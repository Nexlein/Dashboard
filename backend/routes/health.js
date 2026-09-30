const express = require('express');
const prisma = require('../utils/prisma');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            message: 'Database connection failed',
        });
    }
});

module.exports = router;
