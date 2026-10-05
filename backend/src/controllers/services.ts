import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth.ts';
import registry from '../services/registry.ts';
import type { ServiceCredentials, ServiceDefinition } from '../services/types.ts';
import { decryptJson, encryptJson } from '../utils/encryption.ts';
import asyncHandler from '../utils/asyncHandler.ts';
import { accountAccessToken, linkedAccounts } from '../utils/oauthAccounts.ts';
import prisma from '../utils/prisma.ts';
import { authUser } from '../middleware/auth.ts';

/** The connected OAuth accounts of `service`, each with who it is (login, avatar). */
async function connectedAccounts(userId: number, service: ServiceDefinition) {
    const provider = service.connection?.provider;
    if (!provider) return [];
    const accounts = await linkedAccounts(userId, provider);
    return Promise.all(
        accounts.map(async ({ id }) => {
            try {
                const accessToken = await accountAccessToken(userId, id);
                const info = await service.describeAccount?.({ accessToken });
                return { id, login: info?.login ?? null, avatarUrl: info?.avatarUrl ?? null };
            } catch {
                // Revoked on the provider's side: still listed, so it can be removed.
                return { id, login: null, avatarUrl: null };
            }
        }),
    );
}

export const getServices = asyncHandler(async (req, res) => {
    const userId = authUser(req).userId;
    const connections = await prisma.serviceConnection.findMany({ where: { userId } });

    const servicesList = await Promise.all(
        registry.getAllServices().map(async (service) => {
            const name = service.name;
            const connection = connections.find((c) => c.serviceName === name);
            const accounts =
                service.connection?.type === 'oauth'
                    ? await connectedAccounts(userId, service)
                    : [];
            // Services without a connection (chatbot) need nothing from the user.
            const isConnected = !service.connection
                ? true
                : service.connection.type === 'oauth'
                  ? accounts.length > 0
                  : Boolean(connection);
            const displayName = service.displayName || name;
            const description =
                service.connection?.type === 'oauth'
                    ? accounts.length
                        ? `${accounts.length} account${accounts.length > 1 ? 's' : ''} connected`
                        : ''
                    : connection
                      ? `Connected on ${connection.verifiedAt.toLocaleDateString()}`
                      : '';

            return {
                name,
                displayName,
                description,
                connected: isConnected,
                configurable: Boolean(service.connection),
                connectionType: service.connection?.type || null,
                credentialLabel: service.connection?.label ?? null,
                documentationUrl: service.connection?.documentationUrl ?? null,
                keyHint: connection?.keyHint ?? null,
                verifiedAt: connection?.verifiedAt ?? null,
                ...(service.connection?.type === 'oauth' && {
                    provider: service.connection.provider,
                    accounts,
                }),
            };
        }),
    );

    res.json(servicesList);
});

export const connectService = asyncHandler(async (req, res) => {
    const service = registry.getService(String(req.params.serviceName));
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!service.connection) return res.status(400).json({ error: 'Service is not configurable' });
    if (service.connection.type === 'oauth')
        return res.status(400).json({ error: 'Use OAuth flow for this service' });
    if (!service.verifyCredentials)
        return res.status(400).json({ error: 'Service does not accept an API key' });

    const { apiKey } = req.body as { apiKey?: unknown };
    if (typeof apiKey !== 'string' || !apiKey.trim())
        return res.status(400).json({ error: 'API key is required' });
    const normalizedApiKey = apiKey.trim();
    if (normalizedApiKey.length > 256)
        return res.status(400).json({ error: 'API key is too long' });

    await service.verifyCredentials({ apiKey: normalizedApiKey });
    const verifiedAt = new Date();
    const connection = await prisma.serviceConnection.upsert({
        where: { userId_serviceName: { userId: authUser(req).userId, serviceName: service.name } },
        create: {
            userId: authUser(req).userId,
            serviceName: service.name,
            encryptedCredentials: encryptJson({ apiKey: normalizedApiKey }),
            keyHint: normalizedApiKey.slice(-4),
            verifiedAt,
        },
        update: {
            encryptedCredentials: encryptJson({ apiKey: normalizedApiKey }),
            keyHint: normalizedApiKey.slice(-4),
            verifiedAt,
        },
    });

    res.json({ success: true, verifiedAt: connection.verifiedAt, keyHint: connection.keyHint });
});

/** Unlinks accounts through Better Auth, which also checks they belong to the user. */
async function unlinkAccounts(req: Request, accountIds: number[]) {
    for (const accountId of accountIds) {
        await auth.api.unlinkAccount({
            body: { accountId: String(accountId) },
            headers: fromNodeHeaders(req.headers),
        });
    }
}

export const disconnectService = asyncHandler(async (req, res) => {
    const service = registry.getService(String(req.params.serviceName));

    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (!service.connection) return res.status(400).json({ error: 'Service is not configurable' });

    const provider = service.connection.provider;
    if (provider) {
        // Every account connected to the service (they are not ways to sign in).
        const accounts = await linkedAccounts(authUser(req).userId, provider);
        await unlinkAccounts(
            req,
            accounts.map((account) => account.id),
        );
    } else {
        await prisma.serviceConnection.deleteMany({
            where: { userId: authUser(req).userId, serviceName: service.name },
        });
    }

    res.status(204).send();
});

/** Removes one connected account of an OAuth service (e.g. one GitHub account). */
export const disconnectAccount = asyncHandler(async (req, res) => {
    const service = registry.getService(String(req.params.serviceName));
    const provider = service?.connection?.provider;
    if (!provider) return res.status(404).json({ error: 'Service not found' });

    const accountId = Number(req.params.accountId);
    const accounts = await linkedAccounts(authUser(req).userId, provider);
    if (!accounts.some((account) => account.id === accountId))
        return res.status(404).json({ error: 'Account not found' });

    await unlinkAccounts(req, [accountId]);
    res.status(204).send();
});

export const searchService = asyncHandler(async (req, res) => {
    const service = registry.getService(String(req.params.serviceName));
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (typeof service.search !== 'function')
        return res.status(400).json({ error: 'Service does not support search' });

    const connection = await prisma.serviceConnection.findUnique({
        where: {
            userId_serviceName: {
                userId: authUser(req).userId,
                serviceName: service.name,
            },
        },
    });
    if (!connection)
        return res
            .status(409)
            .json({ error: `${service.displayName || service.name} is not connected` });

    const results = await service.search(String(req.query.q || ''), {
        credentials: decryptJson(connection.encryptedCredentials) as ServiceCredentials,
        cacheScope: `${authUser(req).userId}:${connection.id}`,
        userId: authUser(req).userId,
    });
    res.json(results);
});
