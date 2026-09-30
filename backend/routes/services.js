const express = require('express');
const prisma = require('../utils/prisma');
const registry = require('../services/registry');
const { encryptJson } = require('../utils/encryption');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

function publicConnection(service, connection) {
    return {
        name: service.name,
        displayName: service.displayName || service.name,
        description: service.description || null,
        configurable: Boolean(service.connection),
        connectionType: service.connection?.type || null,
        credentialLabel: service.connection?.label || null,
        documentationUrl: service.connection?.documentationUrl || null,
        connected: Boolean(connection),
        keyHint: connection?.keyHint || null,
        verifiedAt: connection?.verifiedAt || null,
        accountInfo: connection?.accountInfo || null,
    };
}

router.get(
    '/',
    asyncHandler(async (req, res) => {
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

        await Promise.all(
            oauthTokens.map(async (token) => {
                let accountInfo = null;
                if (token.provider === 'github') {
                    try {
                        const { decrypt } = require('../utils/crypto');
                        const accessToken = decrypt(token.accessToken);
                        const res = await fetch('https://api.github.com/user', {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'User-Agent': 'Dashboard-App',
                            },
                        });
                        if (res.ok) {
                            const data = await res.json();
                            accountInfo = {
                                username: data.login,
                                avatarUrl: data.avatar_url,
                            };
                        }
                    } catch {
                        // Ignore
                    }
                }
                byService.set(token.provider, {
                    serviceName: token.provider,
                    keyHint: 'OAuth',
                    verifiedAt: token.expiresAt || new Date(),
                    accountInfo,
                });
            }),
        );

        return res.json(
            registry
                .getAllServices()
                .map((service) => publicConnection(service, byService.get(service.name))),
        );
    }),
);

router.put(
    '/:serviceName/connection',
    asyncHandler(async (req, res) => {
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
            if (error.statusCode) {
                return res.status(error.statusCode).json({ error: error.message });
            }
            throw error;
        }
    }),
);

router.delete(
    '/:serviceName/connection',
    asyncHandler(async (req, res) => {
        const service = registry.getService(req.params.serviceName);
        if (!service?.connection) {
            return res.status(404).json({ error: 'Configurable service not found' });
        }

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
    }),
);

module.exports = router;
