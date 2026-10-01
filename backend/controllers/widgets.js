const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const { encryptParams, decryptParams, decryptJson, encryptJson } = require('../utils/encryption');
const registry = require('../services/registry');
const asyncHandler = require('../utils/asyncHandler');

const prisma = new PrismaClient();
const MIN_REFRESH_RATE_SECONDS = 60;

const createWidgetSchema = z.object({
    serviceName: z.string(),
    widgetName: z.string(),
    params: z.record(z.any()),
    refreshRate: z.number().int().min(60, { message: 'Refresh rate must be at least 60 seconds' }),
    layout: z.object({
        x: z.number().int(),
        y: z.number().int(),
        w: z.number().int(),
        h: z.number().int(),
    }),
});

const updateLayoutSchema = z.object({ layouts: z.array(z.any()) });

function isValidRefreshRate(refreshRate) {
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

async function getServiceConnection(userId, service) {
    if (!service.connection) return null;
    if (service.connection.type === 'oauth') {
        const token = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId, provider: service.name } },
        });
        if (!token) return null;
        const { decrypt } = require('../utils/crypto');
        return {
            id: token.id,
            userId,
            serviceName: service.name,
            encryptedCredentials: encryptJson({
                accessToken: decrypt(token.accessToken),
                refreshToken: token.refreshToken ? decrypt(token.refreshToken) : undefined,
            }),
            keyHint: 'OAuth',
            verifiedAt: token.expiresAt || new Date(),
        };
    }
    return prisma.serviceConnection.findUnique({
        where: { userId_serviceName: { userId, serviceName: service.name } },
    });
}

exports.getWidgets = asyncHandler(async (req, res) => {
    try {
        const widgets = await prisma.widgetConfig.findMany({ where: { userId: req.user.userId } });
        const decryptedWidgets = widgets.map((w) => ({
            ...w,
            params: decryptParams(w.params),
            refreshRate: Math.max(w.refreshRate, MIN_REFRESH_RATE_SECONDS),
        }));
        res.json(decryptedWidgets);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.addWidget = asyncHandler(async (req, res) => {
    try {
        const validated = createWidgetSchema.safeParse(req.body);
        if (!validated.success)
            return res
                .status(400)
                .json({
                    error: validated.error.issues[0].message.includes('Refresh')
                        ? validated.error.issues[0].message
                        : 'Missing required widget fields',
                });
        const { serviceName, widgetName, params, refreshRate, layout } = validated.data;

        const service = registry.getService(serviceName);
        if (!service) return res.status(400).json({ error: 'Unsupported widget service' });

        const connection = await getServiceConnection(req.user.userId, service);
        if (service.connection && !connection)
            return res
                .status(409)
                .json({
                    error: `${service.displayName || service.name} is not connected. Configure it in Services.`,
                });

        if (service.execute) {
            try {
                await service.execute(widgetName, params, {
                    userId: req.user.userId,
                    refreshRate: Math.max(refreshRate, MIN_REFRESH_RATE_SECONDS),
                    credentials: connection
                        ? decryptJson(connection.encryptedCredentials)
                        : undefined,
                    cacheScope: connection ? `${req.user.userId}:${connection.id}` : undefined,
                });
            } catch (err) {
                return res
                    .status(err.statusCode || 400)
                    .json({ error: err.statusCode ? err.message : 'Invalid widget configuration' });
            }
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
        res.status(201).json({ ...widget, params: decryptParams(widget.params) });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.updateLayout = asyncHandler(async (req, res) => {
    try {
        const validated = updateLayoutSchema.safeParse(req.body);
        if (!validated.success)
            return res.status(400).json({ error: validated.error.issues[0].message });
        const { layouts } = validated.data;
        await prisma.$transaction(
            layouts.map((l) =>
                prisma.widgetConfig.updateMany({
                    where: { id: l.id, userId: req.user.userId },
                    data: { layout: l.layout },
                }),
            ),
        );
        res.status(204).send();
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.getWidgetData = asyncHandler(async (req, res) => {
    try {
        const widgetId = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(widgetId) || widgetId <= 0)
            return res.status(400).json({ error: 'Invalid widget id' });
        const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
        if (!widget) return res.status(404).json({ error: 'Widget not found' });
        if (widget.userId !== req.user.userId)
            return res.status(403).json({ error: 'Unauthorized to access this widget' });

        const service = registry.getService(widget.serviceName);
        if (!service?.execute) return res.status(400).json({ error: 'Unsupported widget service' });

        const connection = await getServiceConnection(req.user.userId, service);
        if (service.connection && !connection)
            return res
                .status(409)
                .json({
                    error: `${service.displayName || service.name} is not connected. Configure it in Services.`,
                });

        const data = await service.execute(widget.widgetName, decryptParams(widget.params), {
            userId: req.user.userId,
            refreshRate: Math.max(widget.refreshRate, MIN_REFRESH_RATE_SECONDS),
            credentials: connection ? decryptJson(connection.encryptedCredentials) : undefined,
            cacheScope: connection ? `${req.user.userId}:${connection.id}` : undefined,
        });
        return res.json(data);
    } catch (error) {
        return res
            .status(error.statusCode || 500)
            .json({ error: error.statusCode ? error.message : 'Internal server error' });
    }
});

exports.updateWidget = asyncHandler(async (req, res) => {
    try {
        const widgetId = parseInt(req.params.id, 10);
        const { params, refreshRate, layout } = req.body;
        if (refreshRate !== undefined && !isValidRefreshRate(refreshRate))
            return res
                .status(400)
                .json({
                    error: `Refresh rate must be at least ${MIN_REFRESH_RATE_SECONDS} seconds`,
                });

        const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
        if (!existing) return res.status(404).json({ error: 'Widget not found' });
        if (existing.userId !== req.user.userId)
            return res.status(403).json({ error: 'Unauthorized to modify this widget' });

        const updated = await prisma.widgetConfig.update({
            where: { id: widgetId },
            data: {
                ...(params !== undefined && { params: encryptParams(params) }),
                ...(refreshRate !== undefined && { refreshRate }),
                ...(layout && { layout }),
            },
        });
        res.json({ ...updated, params: decryptParams(updated.params) });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.deleteWidget = asyncHandler(async (req, res) => {
    try {
        const widgetId = parseInt(req.params.id, 10);
        const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
        if (!existing) return res.status(404).json({ error: 'Widget not found' });
        if (existing.userId !== req.user.userId)
            return res.status(403).json({ error: 'Unauthorized to delete this widget' });
        await prisma.widgetConfig.delete({ where: { id: widgetId } });
        res.status(204).send();
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.chatWidget = asyncHandler(async (req, res) => {
    try {
        const widgetId = parseInt(req.params.id, 10);
        const { messages } = req.body;
        if (!Array.isArray(messages))
            return res.status(400).json({ error: 'Messages array is required' });

        const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
        if (!widget) return res.status(404).json({ error: 'Widget not found' });
        if (widget.userId !== req.user.userId)
            return res.status(403).json({ error: 'Unauthorized to access this widget' });

        const service = registry.getService(widget.serviceName);
        if (!service?.chat) return res.status(400).json({ error: 'Service does not support chat' });

        const data = await service.chat(
            decryptParams(widget.params),
            { userId: req.user.userId },
            messages,
        );
        return res.json(data);
    } catch (error) {
        const errorMsg = error.cause ? `${error.message} (${error.cause.message})` : error.message;
        return res
            .status(error.statusCode || 500)
            .json({
                error: error.statusCode ? error.message : `Internal server error: ${errorMsg}`,
            });
    }
});
