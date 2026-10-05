import type { Response } from 'express';
import { z } from 'zod';
import { encryptJson, decryptJson } from '../utils/encryption.ts';
import registry from '../services/registry.ts';
import type { ServiceCredentials, WidgetParams } from '../services/types.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import prisma from '../utils/prisma.ts';
import { authUser } from '../middleware/auth.ts';

const MIN_REFRESH_RATE_SECONDS = 60;

const layoutSchema = z.object({
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
});
const paramsSchema = z.record(z.string(), z.unknown());
const refreshRateSchema = z
    .number()
    .int()
    .min(MIN_REFRESH_RATE_SECONDS, { message: 'Refresh rate must be at least 60 seconds' });

const createWidgetSchema = z.object({
    serviceName: z.string(),
    widgetName: z.string(),
    params: paramsSchema,
    refreshRate: refreshRateSchema,
    layout: layoutSchema,
});

const updateWidgetSchema = z.object({
    params: paramsSchema.optional(),
    refreshRate: refreshRateSchema.optional(),
    layout: layoutSchema.optional(),
});

const updateLayoutSchema = z.object({
    layouts: z.array(z.object({ id: z.number().int(), layout: layoutSchema })),
});

const chatSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(['system', 'user', 'assistant']),
                content: z.string(),
            }),
        )
        .min(1, { message: 'Messages array is required' }),
});

/** Returns the positive integer id from a route param, or null. */
function parseWidgetId(raw: unknown): number | null {
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function invalid(res: Response, result: { error: z.ZodError }) {
    return res.status(400).json({ error: result.error.issues[0].message });
}

/** Decrypts a stored JSON object (params, credentials); anything else becomes {}. */
function decryptObject(stored: unknown): Record<string, unknown> {
    const value = decryptJson(stored);
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

export const getWidgets = asyncHandler(async (req, res) => {
    const widgets = await prisma.widgetConfig.findMany({ where: { userId: authUser(req).userId } });
    const decryptedWidgets = widgets.map((w) => ({
        ...w,
        params: decryptJson(w.params),
        refreshRate: Math.max(w.refreshRate, MIN_REFRESH_RATE_SECONDS),
    }));
    res.json(decryptedWidgets);
});

export const addWidget = asyncHandler(async (req, res) => {
    const validated = createWidgetSchema.safeParse(req.body);
    if (!validated.success) return invalid(res, validated);
    const { serviceName, widgetName, params, refreshRate, layout } = validated.data;

    const service = registry.getService(serviceName);
    if (!service) return res.status(400).json({ error: `Unknown service: ${serviceName}` });

    const widgetDef = service.widgets.find((w) => w.name === widgetName);
    if (!widgetDef)
        return res
            .status(400)
            .json({ error: `Unknown widget: ${widgetName} in service ${serviceName}` });

    let connection = null;
    if (serviceName === 'weather' || service.configurable) {
        connection = await prisma.serviceConnection.findUnique({
            where: { userId_serviceName: { userId: authUser(req).userId, serviceName } },
        });
        if (!connection)
            return res
                .status(409)
                .json({ error: `${service.displayName || serviceName} is not connected` });
    }

    if (typeof service.execute === 'function') {
        try {
            await service.execute(widgetName, params, {
                userId: authUser(req).userId,
                refreshRate: Math.max(refreshRate, MIN_REFRESH_RATE_SECONDS),
                credentials: connection
                    ? (decryptObject(connection.encryptedCredentials) as ServiceCredentials)
                    : null,
                ...(connection && { cacheScope: `${authUser(req).userId}:${connection.id}` }),
            });
        } catch (execError) {
            return res
                .status(400)
                .json({ error: errorMessage(execError, 'Widget validation failed') });
        }
    }

    const newWidget = await prisma.widgetConfig.create({
        data: {
            userId: authUser(req).userId,
            serviceName,
            widgetName,
            params: encryptJson(params),
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

export const updateLayout = asyncHandler(async (req, res) => {
    const validated = updateLayoutSchema.safeParse(req.body);
    if (!validated.success) return invalid(res, validated);
    const { layouts } = validated.data;
    await prisma.$transaction(
        layouts.map((l) =>
            prisma.widgetConfig.updateMany({
                where: { id: l.id, userId: authUser(req).userId },
                data: { layout: l.layout },
            }),
        ),
    );
    res.status(204).send();
});

export const getWidgetData = asyncHandler(async (req, res) => {
    const widgetId = parseWidgetId(req.params.id);
    if (!widgetId) return res.status(400).json({ error: 'Invalid widget id' });
    const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!widget) return res.status(404).json({ error: 'Widget not found' });
    if (widget.userId !== authUser(req).userId)
        return res.status(403).json({ error: 'Unauthorized to view this widget' });

    const service = registry.getService(widget.serviceName);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    let connection = null;
    if (widget.serviceName === 'weather' || service.configurable) {
        connection = await prisma.serviceConnection.findUnique({
            where: {
                userId_serviceName: {
                    userId: authUser(req).userId,
                    serviceName: widget.serviceName,
                },
            },
        });
        if (!connection)
            return res
                .status(409)
                .json({ error: `${service.displayName || widget.serviceName} is not connected` });
    }

    // Services that declare widgets without fetching any data (e.g. YouTube placeholders).
    if (!service.execute)
        return res.status(501).json({ error: 'Widget data is not available for this service' });

    const params: WidgetParams = decryptObject(widget.params);
    let data: unknown;
    try {
        data = await service.execute(widget.widgetName, params, {
            userId: authUser(req).userId,
            refreshRate: Math.max(widget.refreshRate, MIN_REFRESH_RATE_SECONDS),
            credentials: connection ? decryptObject(connection.encryptedCredentials) : null,
            ...(connection && { cacheScope: `${authUser(req).userId}:${connection.id}` }),
        });
    } catch (execError) {
        return res
            .status(502)
            .json({ error: errorMessage(execError, 'Failed to fetch widget data') });
    }

    res.json(data);
});

export const updateWidget = asyncHandler(async (req, res) => {
    const widgetId = parseWidgetId(req.params.id);
    if (!widgetId) return res.status(400).json({ error: 'Invalid widget id' });
    const validated = updateWidgetSchema.safeParse(req.body);
    if (!validated.success) return invalid(res, validated);
    const { params, refreshRate, layout } = validated.data;

    const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!existing) return res.status(404).json({ error: 'Widget not found' });
    if (existing.userId !== authUser(req).userId)
        return res.status(403).json({ error: 'Unauthorized to update this widget' });

    const updated = await prisma.widgetConfig.update({
        where: { id: widgetId },
        data: {
            ...(params && { params: encryptJson(params) }),
            ...(refreshRate !== undefined && { refreshRate }),
            ...(layout && { layout }),
        },
    });

    res.json({ ...updated, params: decryptJson(updated.params) });
});

export const deleteWidget = asyncHandler(async (req, res) => {
    const widgetId = parseWidgetId(req.params.id);
    if (!widgetId) return res.status(400).json({ error: 'Invalid widget id' });
    const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!existing) return res.status(404).json({ error: 'Widget not found' });
    if (existing.userId !== authUser(req).userId)
        return res.status(403).json({ error: 'Unauthorized to delete this widget' });

    await prisma.widgetConfig.delete({ where: { id: widgetId } });
    res.status(204).send();
});

export const chatWidget = asyncHandler(async (req, res) => {
    const widgetId = parseWidgetId(req.params.id);
    if (!widgetId) return res.status(400).json({ error: 'Invalid widget id' });
    const validated = chatSchema.safeParse(req.body);
    if (!validated.success) return invalid(res, validated);

    const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!widget) return res.status(404).json({ error: 'Widget not found' });
    if (widget.userId !== authUser(req).userId)
        return res.status(403).json({ error: 'Unauthorized' });

    const service = registry.getService(widget.serviceName);
    if (typeof service?.chat !== 'function')
        return res.status(400).json({ error: 'Widget does not support chat' });

    try {
        const data = await service.chat(
            decryptObject(widget.params),
            { userId: authUser(req).userId },
            validated.data.messages,
        );
        res.json(data);
    } catch (chatError) {
        // Ollama answered with an error status: forward it. Otherwise it is unreachable.
        if ((chatError as { statusCode?: number }).statusCode) throw chatError;
        res.status(502).json({ error: 'Failed to communicate with chatbot' });
    }
});
