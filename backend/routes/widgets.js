const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /widgets -> Get all widgets for the authenticated user
router.get('/', async (req, res) => {
    try {
        const widgets = await prisma.widgetConfig.findMany({
            where: { userId: req.user.userId },
        });
        res.json(widgets);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /widgets -> Add a new widget
router.post('/', async (req, res) => {
    try {
        const { serviceName, widgetName, params, refreshRate, layout } = req.body;

        if (!serviceName || !widgetName || !params || !refreshRate || !layout) {
            return res.status(400).json({ error: 'Missing required widget fields' });
        }

        const widget = await prisma.widgetConfig.create({
            data: {
                userId: req.user.userId,
                serviceName,
                widgetName,
                params,
                refreshRate,
                layout,
            },
        });

        res.status(201).json(widget);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /widgets/:id -> Update an existing widget
router.put('/:id', async (req, res) => {
    try {
        const widgetId = parseInt(req.params.id, 10);
        const { params, refreshRate, layout } = req.body;

        // Ensure the widget belongs to the user
        const existing = await prisma.widgetConfig.findUnique({
            where: { id: widgetId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Widget not found' });
        }

        if (existing.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized to modify this widget' });
        }

        const updated = await prisma.widgetConfig.update({
            where: { id: widgetId },
            data: {
                ...(params && { params }),
                ...(refreshRate && { refreshRate }),
                ...(layout && { layout }),
            },
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /widgets/:id -> Delete a widget
router.delete('/:id', async (req, res) => {
    try {
        const widgetId = parseInt(req.params.id, 10);

        const existing = await prisma.widgetConfig.findUnique({
            where: { id: widgetId },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Widget not found' });
        }

        if (existing.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized to delete this widget' });
        }

        await prisma.widgetConfig.delete({
            where: { id: widgetId },
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
