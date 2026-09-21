const express = require('express');
const { PrismaClient } = require('@prisma/client');
const registry = require('../services/registry');
const { encryptJson } = require('../utils/encryption');

const router = express.Router();
const prisma = new PrismaClient();

function publicConnection(service, connection) {
    return {
        name: service.name,
        displayName: service.displayName || service.name,
        configurable: Boolean(service.connection),
        connectionType: service.connection?.type || null,
        credentialLabel: service.connection?.label || null,
        documentationUrl: service.connection?.documentationUrl || null,
        connected: Boolean(connection),
        keyHint: connection?.keyHint || null,
        verifiedAt: connection?.verifiedAt || null,
    };
}

router.get('/', async (req, res) => {
    try {
        const [connections, oauthTokens] = await Promise.all([
            prisma.serviceConnection.findMany({
                where: { userId: req.user.userId },
            }),
            prisma.oAuthToken.findMany({
                where: { userId: req.user.userId },
            }),
        ]);

        const byService = new Map();
        connections.forEach((conn) => byService.set(conn.serviceName, conn));
        oauthTokens.forEach((token) => {
            byService.set(token.provider, {
                serviceName: token.provider,
                keyHint: 'OAuth',
                verifiedAt: token.expiresAt || new Date(),
            });
        });

        return res.json(
            registry
                .getAllServices()
                .map((service) => publicConnection(service, byService.get(service.name))),
        );
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:serviceName/connection', async (req, res) => {
    const service = registry.getService(req.params.serviceName);
    if (!service?.connection || service.connection.type !== 'apiKey') {
        return res.status(404).json({ error: 'Configurable service not found' });
    }

    const apiKey = typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : '';
    if (!apiKey || apiKey.length > 256) {
        return res.status(400).json({ error: 'A valid API key is required' });
    }

    try {
        await service.verifyCredentials({ apiKey });
        const verifiedAt = new Date();
        const connection = await prisma.serviceConnection.upsert({
            where: {
                userId_serviceName: {
                    userId: req.user.userId,
                    serviceName: service.name,
                },
            },
            create: {
                userId: req.user.userId,
                serviceName: service.name,
                encryptedCredentials: encryptJson({ apiKey }),
                keyHint: apiKey.slice(-4),
                verifiedAt,
            },
            update: {
                encryptedCredentials: encryptJson({ apiKey }),
                keyHint: apiKey.slice(-4),
                verifiedAt,
            },
        });

        service.clearCache?.();
        return res.json(publicConnection(service, connection));
    } catch (error) {
        if (error.message === 'Weather API key is invalid or not active yet') {
            return res.status(400).json({ error: error.message });
        }
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Internal server error',
        });
    }
});

router.delete('/:serviceName/connection', async (req, res) => {
    const service = registry.getService(req.params.serviceName);
    if (!service?.connection) {
        return res.status(404).json({ error: 'Configurable service not found' });
    }

    try {
        if (service.connection.type === 'oauth') {
            await prisma.oAuthToken.deleteMany({
                where: {
                    userId: req.user.userId,
                    provider: service.name,
                },
            });
        } else {
            await prisma.serviceConnection.deleteMany({
                where: {
                    userId: req.user.userId,
                    serviceName: service.name,
                },
            });
        }
        service.clearCache?.();
        return res.status(204).send();
    } catch {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
