import { auth } from '../auth.ts';
import prisma from './prisma.ts';

/**
 * The access token of the user's linked `providerId` account (e.g. "github"), or null when
 * none is linked. Better Auth decrypts it and refreshes it first when it has expired.
 */
export async function getProviderAccessToken(
    userId: number,
    providerId: string,
): Promise<string | null> {
    const account = await prisma.account.findFirst({
        where: { userId, providerId },
        select: { id: true },
    });
    if (!account) return null;
    const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: String(account.id), userId: String(userId) },
    });
    return accessToken ?? null;
}
