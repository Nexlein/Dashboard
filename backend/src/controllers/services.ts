import registry from '../services/registry.ts';
import { decryptString, encryptJson } from '../utils/encryption.ts';
import asyncHandler from '../utils/asyncHandler.ts';

import prisma from '../utils/prisma.ts';
import { authUser } from '../middleware/auth.ts';

export const getServices = asyncHandler(async (req, res) => {
    const [connections, oauthTokens] = await Promise.all([
        prisma.serviceConnection.findMany({ where: { userId: authUser(req).userId } }),
        prisma.oAuthToken.findMany({ where: { userId: authUser(req).userId } }),
    ]);

    const connectedServiceNames = new Set([
        ...connections.map((c) => c.serviceName),
        ...oauthTokens.map((t) => t.provider),
    ]);

    const servicesList = await Promise.all(
        registry.getAllServices().map(async (service) => {
            const name = service.name;
            const isConnected = connectedServiceNames.has(name) || !service.configurable;
            let displayName = service.displayName || name;
            let description = '';

            if (isConnected) {
                const connection = connections.find((c) => c.serviceName === name);
                const token = oauthTokens.find((t) => t.provider === name);

                if (token && name === 'github') {
                    try {
                        const accessToken = decryptString(token.accessToken);
                        const res = await fetch('https://api.github.com/user', {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                Accept: 'application/vnd.github.v3+json',
                                'User-Agent': 'Dashboard-App',
                            },
                        });
                        if (res.ok) {
                            const data = (await res.json()) as {
                                login?: string;
                                name?: string | null;
                                bio?: string | null;
                            };
                            if (data.login) {
                                displayName = data.login;
                                description = data.name || data.bio || 'GitHub Account';
                            }
                        }
                    } catch {
                        // Silently ignore GitHub fetch error on listing
                    }
                } else if (connection) {
                    description = `Connected on ${connection.verifiedAt.toLocaleDateString()}`;
                }
            }

            return {
                name,
                displayName,
                description,
                connected: isConnected,
                configurable: service.configurable !== false,
                connectionType: service.connection?.type || 'apikey',
                credentialLabel: service.connection?.label ?? null,
                documentationUrl: service.connection?.documentationUrl,
                keyHint: connections.find((c) => c.serviceName === name)?.keyHint,
            };
        }),
    );

    res.json(servicesList);
});

export const connectService = asyncHandler(async (req, res) => {
    const serviceName = String(req.params.serviceName);
    const { apiKey } = req.body as { apiKey?: unknown };

    if (typeof apiKey !== 'string' || !apiKey.trim())
        return res.status(400).json({ error: 'API key is required' });

    const service = registry.getService(serviceName);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.configurable === false)
        return res.status(400).json({ error: 'Service is not configurable' });
    if (service.connection?.type === 'oauth')
        return res.status(400).json({ error: 'Use OAuth flow for this service' });
    if (!service.verifyCredentials)
        return res.status(400).json({ error: 'Service does not accept an API key' });

    await service.verifyCredentials({ apiKey }); // Throws error if invalid

    const verifiedAt = new Date();
    const connection = await prisma.serviceConnection.upsert({
        where: { userId_serviceName: { userId: authUser(req).userId, serviceName: service.name } },
        create: {
            userId: authUser(req).userId,
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

    res.json({ success: true, verifiedAt: connection.verifiedAt, keyHint: connection.keyHint });
});

export const disconnectService = asyncHandler(async (req, res) => {
    const service = registry.getService(String(req.params.serviceName));

    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.configurable === false)
        return res.status(400).json({ error: 'Service is not configurable' });

    if (service.connection?.type === 'oauth') {
        await prisma.oAuthToken.deleteMany({
            where: { userId: authUser(req).userId, provider: service.name },
        });
    } else {
        await prisma.serviceConnection.deleteMany({
            where: { userId: authUser(req).userId, serviceName: service.name },
        });
    }

    res.status(204).send();
});
