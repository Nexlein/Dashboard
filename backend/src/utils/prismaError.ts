/** The Prisma error code (e.g. P2002, P2025) carried by an error, if any. */
export function prismaErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
    return typeof error.code === 'string' ? error.code : undefined;
}
