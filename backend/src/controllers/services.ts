import { APIError } from 'better-auth/api';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.ts';
import registry from '../services/registry.ts';
import { encryptJson } from '../utils/encryption.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import { getProviderAccessToken } from '../utils/oauthAccounts.ts';
import prisma from '../utils/prisma.ts';
import { authUser } from '../middleware/auth.ts';

export const getServices = asyncHandler(async (req, res) => {
    const userId = authUser(req).userId;
    const [connections, accounts] = await Promise.all([
        prisma.serviceConnection.findMany({ where: { userId } }),
        // OAuth services are connected through a linked Better Auth account.
        prisma.account.findMany({ where: { userId }, select: { providerId: true } }),
    ]);

    const connectedServiceNames = new Set([
        ...connections.map((c) => c.serviceName),
        ...accounts.map((a) => a.providerId),
    ]);

    const servicesList = await Promise.all(
        registry.getAllServices().map(async (service) => {
            const name = service.name;
            // Services without a connection (YouTube, chatbot) need nothing from the user.
            const isConnected = service.connection ? connectedServiceNames.has(name) : true;
            let displayName = service.displayName || name;
            let description = '';

            if (isConnected) {
                const connection = connections.find((c) => c.serviceName === name);
                const linked = accounts.some((a) => a.providerId === name);

                if (linked && name === 'github') {
                    try {
                        const accessToken = await getProviderAccessToken(userId, name);
                        if (!accessToken) throw new Error('No GitHub token');
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
        const account = await prisma.account.findFirst({
            where: { userId: authUser(req).userId, providerId: service.name },
            select: { id: true },
        });
        if (!account) return res.status(204).send();
        try {
            await auth.api.unlinkAccount({
                body: { accountId: String(account.id) },
                headers: fromNodeHeaders(req.headers),
            });
        } catch (error) {
            // Better Auth keeps the last sign-in method of an account (e.g. GitHub-only users).
            if (error instanceof APIError && error.body?.code === 'FAILED_TO_UNLINK_LAST_ACCOUNT')
                return res.status(409).json({
                    error: 'GitHub is how you sign in to this account, so it cannot be disconnected.',
                });
            throw error;
        }
    } else {
        await prisma.serviceConnection.deleteMany({
            where: { userId: authUser(req).userId, serviceName: service.name },
        });
    }

    res.status(204).send();
});
