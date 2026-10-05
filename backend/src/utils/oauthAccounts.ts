import { auth } from '../auth.ts';
import prisma from './prisma.ts';

/** The user's accounts linked for `providerId` (e.g. "github-service"), oldest first. */
export function linkedAccounts(userId: number, providerId: string) {
    return prisma.account.findMany({
        where: { userId, providerId },
        select: { id: true, accountId: true },
        orderBy: { id: 'asc' },
    });
}

/**
 * The access token of one of the user's linked accounts. Better Auth decrypts it and refreshes
 * it first when it has expired.
 */
export async function accountAccessToken(userId: number, accountId: number): Promise<string> {
    const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: String(accountId), userId: String(userId) },
    });
    if (!accessToken) throw new Error('No access token for this account');
    return accessToken;
}
