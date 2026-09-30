const prisma = require('../utils/prisma');
const { encryptParams, decryptParams, decryptJson, encryptJson } = require('../utils/encryption');
const registry = require('./registry');

const MIN_REFRESH_RATE_SECONDS = 60;

function isValidRefreshRate(refreshRate) {
    return Number.isInteger(refreshRate) && refreshRate >= MIN_REFRESH_RATE_SECONDS;
}

async function getServiceConnection(userId, service) {
    if (!service.connection) return null;

    if (service.connection.type === 'oauth') {
        const token = await prisma.oAuthToken.findUnique({
            where: {
                userId_provider: {
                    userId,
                    provider: service.name,
                },
            },
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
        where: {
            userId_serviceName: {
                userId,
                serviceName: service.name,
            },
        },
    });
}

class WidgetError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

async function getUserWidgets(userId) {
    const widgets = await prisma.widgetConfig.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
    });
    return widgets.map((w) => ({
        ...w,
        params: decryptParams(w.params),
    }));
}

async function createWidget(userId, { serviceName, widgetName, params, refreshRate, layout }) {
    if (!isValidRefreshRate(refreshRate)) {
        throw new WidgetError(
            `Refresh rate must be at least ${MIN_REFRESH_RATE_SECONDS} seconds`,
            400,
        );
    }

    const service = registry.getService(serviceName);
    if (!service) throw new WidgetError('Unsupported widget service', 400);

    const connection = await getServiceConnection(userId, service);
    if (service.connection && !connection) {
        throw new WidgetError(
            `${service.displayName || service.name} is not connected. Configure it in Services.`,
            409,
        );
    }

    if (service.execute) {
        try {
            await service.execute(widgetName, params, {
                userId,
                refreshRate: Math.max(refreshRate, MIN_REFRESH_RATE_SECONDS),
                credentials: connection ? decryptJson(connection.encryptedCredentials) : undefined,
                cacheScope: connection ? `${userId}:${connection.id}` : undefined,
            });
        } catch (err) {
            throw new WidgetError(
                err.statusCode ? err.message : 'Invalid widget configuration',
                err.statusCode || 400,
            );
        }
    }

    const widget = await prisma.widgetConfig.create({
        data: {
            userId,
            serviceName,
            widgetName,
            params: encryptParams(params),
            refreshRate,
            layout,
        },
    });

    return {
        ...widget,
        params: decryptParams(widget.params),
    };
}

async function updateWidgetLayouts(userId, layouts) {
    if (!Array.isArray(layouts)) {
        throw new WidgetError('Layouts must be an array', 400);
    }

    await prisma.$transaction(
        layouts.map((l) =>
            prisma.widgetConfig.updateMany({
                where: { id: l.id, userId },
                data: { layout: l.layout },
            }),
        ),
    );
}

async function getWidgetData(userId, widgetId) {
    const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!widget) throw new WidgetError('Widget not found', 404);
    if (widget.userId !== userId) throw new WidgetError('Unauthorized to access this widget', 403);

    const service = registry.getService(widget.serviceName);
    if (!service?.execute) throw new WidgetError('Unsupported widget service', 400);

    const connection = await getServiceConnection(userId, service);
    if (service.connection && !connection) {
        throw new WidgetError(
            `${service.displayName || service.name} is not connected. Configure it in Services.`,
            409,
        );
    }

    const data = await service.execute(widget.widgetName, decryptParams(widget.params), {
        userId,
        refreshRate: Math.max(widget.refreshRate, MIN_REFRESH_RATE_SECONDS),
        credentials: connection ? decryptJson(connection.encryptedCredentials) : undefined,
        cacheScope: connection ? `${userId}:${connection.id}` : undefined,
    });
    return data;
}

async function updateWidget(userId, widgetId, { params, refreshRate, layout }) {
    if (refreshRate !== undefined && !isValidRefreshRate(refreshRate)) {
        throw new WidgetError(
            `Refresh rate must be at least ${MIN_REFRESH_RATE_SECONDS} seconds`,
            400,
        );
    }

    const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!existing) throw new WidgetError('Widget not found', 404);
    if (existing.userId !== userId)
        throw new WidgetError('Unauthorized to modify this widget', 403);

    const updated = await prisma.widgetConfig.update({
        where: { id: widgetId },
        data: {
            ...(params !== undefined && { params: encryptParams(params) }),
            ...(refreshRate !== undefined && { refreshRate }),
            ...(layout && { layout }),
        },
    });

    return {
        ...updated,
        params: decryptParams(updated.params),
    };
}

async function deleteWidget(userId, widgetId) {
    const existing = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!existing) throw new WidgetError('Widget not found', 404);
    if (existing.userId !== userId)
        throw new WidgetError('Unauthorized to delete this widget', 403);

    await prisma.widgetConfig.delete({ where: { id: widgetId } });
}

async function chatWidget(userId, widgetId, messages) {
    if (!Array.isArray(messages)) throw new WidgetError('Messages array is required', 400);

    const widget = await prisma.widgetConfig.findUnique({ where: { id: widgetId } });
    if (!widget) throw new WidgetError('Widget not found', 404);
    if (widget.userId !== userId) throw new WidgetError('Unauthorized to access this widget', 403);

    const service = registry.getService(widget.serviceName);
    if (!service?.chat) throw new WidgetError('Service does not support chat', 400);

    try {
        return await service.chat(decryptParams(widget.params), { userId }, messages);
    } catch (error) {
        const errorMsg = error.cause ? `${error.message} (${error.cause.message})` : error.message;
        throw new WidgetError(
            error.statusCode ? error.message : `Internal server error: ${errorMsg}`,
            error.statusCode || 500,
        );
    }
}

module.exports = {
    WidgetError,
    getUserWidgets,
    createWidget,
    updateWidgetLayouts,
    getWidgetData,
    updateWidget,
    deleteWidget,
    chatWidget,
};
