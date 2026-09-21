const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { encryptParams, decryptParams, decryptJson } = require('../utils/encryption');
const registry = require('../services/registry');

const router = express.Router();
const prisma = new PrismaClient();
const MIN_REFRESH_RATE_SECONDS = 60;

function isValidRefreshRate(refreshRate) {
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

async function getServiceConnection(userId, service) {
    if (!service.connection) return null;

    return prisma.serviceConnection.findUnique({
        where: {
            userId_serviceName: {
                userId,
                serviceName: service.name,
            },
        },
    });
}

// GET /widgets -> Get all widgets for the authenticated user
router.get('/', async (req, res) => {
    try {
        const widgets = await prisma.widgetConfig.findMany({
            where: { userId: req.user.userId },
        });

        const decryptedWidgets = widgets.map((w) => ({
            ...w,
            params: decryptParams(w.params),
            refreshRate: Math.max(w.refreshRate, MIN_REFRESH_RATE_SECONDS),
        }));

        res.json(decryptedWidgets);
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
        if (!isValidRefreshRate(refreshRate)) {
            return res.status(400).json({
                error: `Refresh rate must be at least ${MIN_REFRESH_RATE_SECONDS} seconds`,
            });
        }

        const service = registry.getService(serviceName);
        if (!service) return res.status(400).json({ error: 'Unsupported widget service' });
        if (service.connection && !(await getServiceConnection(req.user.userId, service))) {
            return res.status(409).json({
                error: `${service.displayName || service.name} is not connected. Configure it in Services.`,
            });
        }

        const widget = await prisma.widgetConfig.create({
            data: {
                userId: req.user.userId,
                serviceName,
                widgetName,
                params: encryptParams(params),
                refreshRate,
                layout,
            },
        });

        // Decrypt immediately before sending back to frontend
        res.status(201).json({
            ...widget,
            params: decryptParams(widget.params),
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /widgets/layout -> Batch update layouts for widgets
router.put('/layout', async (req, res) => {
    try {
        const { layouts } = req.body;
        if (!Array.isArray(layouts)) {
            return res.status(400).json({ error: 'Layouts must be an array' });
        }

        // We can execute multiple updates in a transaction
        await prisma.$transaction(
            layouts.map((l) =>
                prisma.widgetConfig.updateMany({
                    where: { id: l.id, userId: req.user.userId },
                    data: { layout: l.layout },
                }),
            ),
        );

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /widgets/:id/data -> Execute a configured widget for its owner
router.get('/:id/data', async (req, res) => {
    try {
        const widgetId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(widgetId) || widgetId <= 0) {
            return res.status(400).json({ error: 'Invalid widget id' });
        }

        const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
        if (!widget) return res.status(404).json({ error: 'Widget not found' });
        if (widget.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized to access this widget' });
        }

        const service = registry.getService(widget.serviceName);
        if (!service?.execute) {
            return res.status(400).json({ error: 'Unsupported widget service' });
        }

        const connection = await getServiceConnection(req.user.userId, service);
        if (service.connection && !connection) {
            return res.status(409).json({
                error: `${service.displayName || service.name} is not connected. Configure it in Services.`,
            });
        }

        const data = await service.execute(widget.widgetName, decryptParams(widget.params), {
            refreshRate: Math.max(widget.refreshRate, MIN_REFRESH_RATE_SECONDS),
            credentials: connection ? decryptJson(connection.encryptedCredentials) : undefined,
            cacheScope: connection ? `${req.user.userId}:${connection.id}` : undefined,
        });
        return res.json(data);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Internal server error',
        });
    }
});

// PUT /widgets/:id -> Update an existing widget
router.put('/:id', async (req, res) => {
    try {
        const widgetId = parseInt(req.params.id, 10);
        const { params, refreshRate, layout } = req.body;

        if (refreshRate !== undefined && !isValidRefreshRate(refreshRate)) {
            return res.status(400).json({
                error: `Refresh rate must be at least ${MIN_REFRESH_RATE_SECONDS} seconds`,
            });
        }

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
                ...(params !== undefined && { params: encryptParams(params) }),
                ...(refreshRate !== undefined && { refreshRate }),
                ...(layout && { layout }),
            },
        });

        res.json({
            ...updated,
            params: decryptParams(updated.params),
        });
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
