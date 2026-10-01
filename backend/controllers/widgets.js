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

const updateLayoutSchema = z.object({
    layouts: z.array(
        z.object({
            id: z.number().int(),
            layout: z.object({
                x: z.number().int(),
                y: z.number().int(),
                w: z.number().int(),
                h: z.number().int(),
            }),
        }),
    ),
});

function isValidRefreshRate(rate) {
    return Number.isInteger(rate) && rate >= MIN_REFRESH_RATE_SECONDS;
}

exports.getWidgets = asyncHandler(async (req, res) => {
    const widgets = await prisma.widgetConfig.findMany({ where: { userId: req.user.userId } });
    const decryptedWidgets = widgets.map((w) => ({
        ...w,
        params: decryptParams(w.params),
        refreshRate: Math.max(w.refreshRate, MIN_REFRESH_RATE_SECONDS),
    }));
    res.json(decryptedWidgets);
});

exports.addWidget = asyncHandler(async (req, res) => {
    const validated = createWidgetSchema.safeParse(req.body);
    if (!validated.success)
        return res.status(400).json({ error: validated.error.issues[0].message });
    const { serviceName, widgetName, params, refreshRate, layout } = validated.data;

    const service = registry[serviceName];
    if (!service) return res.status(400).json({ error: `Unknown service: ${serviceName}` });

    const widgetDef = service.widgets.find(
        (w) => w.id === widgetName || w.aliases?.includes(widgetName),
    );
    if (!widgetDef)
        return res
            .status(400)
            .json({ error: `Unknown widget: ${widgetName} in service ${serviceName}` });

    let connection = null;
    if (serviceName === 'weather' || service.configurable) {
        connection = await prisma.serviceConnection.findUnique({
            where: { userId_serviceName: { userId: req.user.userId, serviceName } },
        });
        if (!connection)
            return res
                .status(403)
                .json({ error: `${service.displayName || serviceName} connection required` });
    }

    if (typeof service.execute === 'function') {
        try {
            await service.execute(widgetName, params, {
                userId: req.user.userId,
                refreshRate: Math.max(refreshRate, MIN_REFRESH_RATE_SECONDS),
                credentials: connection ? decryptJson(connection.encryptedCredentials) : null,
            });
        } catch (execError) {
            return res.status(400).json({ error: execError.message || 'Widget validation failed' });
        }
    }

    const newWidget = await prisma.widgetConfig.create({
        data: {
            userId: req.user.userId,
            serviceName,
            widgetName,
            params: encryptParams(params),
            refreshRate: Math.max(refreshRate, MIN_REFRESH_RATE_SECONDS),
            layout,
        },
    });

    res.status(201).json({
        ...newWidget,
        params,
        refreshRate: newWidget.refreshRate,
    });
});

exports.updateLayout = asyncHandler(async (req, res) => {
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
});

exports.getWidgetData = asyncHandler(async (req, res) => {
    const widgetId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(widgetId) || widgetId <= 0)
        return res.status(400).json({ error: 'Invalid widget id' });
    const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!widget) return res.status(404).json({ error: 'Widget not found' });
    if (widget.userId !== req.user.userId)
        return res.status(403).json({ error: 'Unauthorized to view this widget' });

    const service = registry[widget.serviceName];
    if (!service) return res.status(404).json({ error: 'Service not found' });

    let connection = null;
    if (widget.serviceName === 'weather' || service.configurable) {
        connection = await prisma.serviceConnection.findUnique({
            where: {
                userId_serviceName: { userId: req.user.userId, serviceName: widget.serviceName },
            },
        });
        if (!connection)
            return res
                .status(403)
                .json({
                    error: `${service.displayName || widget.serviceName} connection required`,
                });
    }

    const params = decryptParams(widget.params);
    let data;
    try {
        data = await service.execute(widget.widgetName, params, {
            userId: req.user.userId,
            refreshRate: Math.max(widget.refreshRate, MIN_REFRESH_RATE_SECONDS),
            credentials: connection ? decryptJson(connection.encryptedCredentials) : null,
        });
    } catch (execError) {
        return res.status(502).json({ error: execError.message || 'Failed to fetch widget data' });
    }

    res.json(data);
});

exports.updateWidget = asyncHandler(async (req, res) => {
    const widgetId = parseInt(req.params.id, 10);
    const { params, refreshRate, layout } = req.body;
    if (refreshRate !== undefined && !isValidRefreshRate(refreshRate))
        return res.status(400).json({ error: 'Refresh rate must be at least 60 seconds' });

    const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!existing) return res.status(404).json({ error: 'Widget not found' });
    if (existing.userId !== req.user.userId)
        return res.status(403).json({ error: 'Unauthorized to update this widget' });

    const updated = await prisma.widgetConfig.update({
        where: { id: widgetId },
        data: {
            ...(params && { params: encryptParams(params) }),
            ...(refreshRate !== undefined && { refreshRate }),
            ...(layout && { layout }),
        },
    });

    res.json({ ...updated, params: decryptParams(updated.params) });
});

exports.deleteWidget = asyncHandler(async (req, res) => {
    const widgetId = parseInt(req.params.id, 10);
    const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!existing) return res.status(404).json({ error: 'Widget not found' });
    if (existing.userId !== req.user.userId)
        return res.status(403).json({ error: 'Unauthorized to delete this widget' });

    await prisma.widgetConfig.delete({ where: { id: widgetId } });
    res.status(204).send();
});

exports.chatWidget = asyncHandler(async (req, res) => {
    const widgetId = parseInt(req.params.id, 10);
    const { messages } = req.body;
    if (!Array.isArray(messages))
        return res.status(400).json({ error: 'Messages array is required' });

    const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!widget) return res.status(404).json({ error: 'Widget not found' });
    if (widget.userId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });
    if (widget.serviceName !== 'chatbot')
        return res.status(400).json({ error: 'Widget does not support chat' });

    const service = registry['chatbot'];
    const params = decryptParams(widget.params);

    let data;
    try {
        data = await service.execute(
            'chatbot_message',
            { ...params, messages },
            { userId: req.user.userId },
        );
    } catch (execError) {
        return res
            .status(502)
            .json({ error: execError.message || 'Failed to communicate with chatbot' });
    }

    res.json(data);
});
