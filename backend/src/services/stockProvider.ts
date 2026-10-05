import { createHash, randomUUID } from 'node:crypto';
import { getCache, setCache, redisClient } from '../utils/redisCache.ts';

const localLocks = new Set<string>();
const DEFAULT_LIMIT = 8;
type Budget = { window: number; remaining: number; limit: number; blockedUntil?: number };

export class StockPendingError extends Error {
    statusCode = 429;
    retryAfter: number;
    constructor(
        retryAt: number,
        message = 'Stock data is waiting for available Twelve Data credits',
    ) {
        super(message);
        this.retryAfter = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
    }
}

function scope(apiKey: string) {
    return `stocks:provider:${createHash('sha256').update(apiKey).digest('hex')}`;
}

/** One shared provider session across API replicas, so identical widgets reuse caches. */
export async function withStockProvider<T>(apiKey: string, work: () => Promise<T>): Promise<T> {
    const key = `${scope(apiKey)}:lock`;
    const token = randomUUID();
    const shared = redisClient?.isReady ? redisClient : null;
    if (shared) {
        if (!(await shared.set(key, token, { NX: true, PX: 120_000 }))) {
            throw new StockPendingError(
                Date.now() + 2000,
                'Another stock widget is loading; your data will follow automatically',
            );
        }
    } else {
        if (localLocks.has(key)) throw new StockPendingError(Date.now() + 2000);
        localLocks.add(key);
    }
    try {
        return await work();
    } finally {
        if (shared) {
            await shared.eval(
                "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
                { keys: [key], arguments: [token] },
            );
        } else localLocks.delete(key);
    }
}

function nextMinute() {
    return (Math.floor(Date.now() / 60_000) + 1) * 60_000 + 1000;
}

async function budget(apiKey: string): Promise<Budget> {
    const saved = await getCache<Budget>(`${scope(apiKey)}:budget`);
    if (saved?.blockedUntil && saved.blockedUntil > Date.now())
        throw new StockPendingError(saved.blockedUntil);
    const window = Math.floor(Date.now() / 60_000);
    return saved?.window === window
        ? saved
        : {
              window,
              remaining: saved?.limit ?? DEFAULT_LIMIT,
              limit: saved?.limit ?? DEFAULT_LIMIT,
          };
}

export async function reserveStockCredits(apiKey: string, cost: number) {
    const current = await budget(apiKey);
    if (current.remaining < cost) throw new StockPendingError(nextMinute());
    await setCache(
        `${scope(apiKey)}:budget`,
        { ...current, remaining: current.remaining - cost },
        24 * 60 * 60 * 1000,
    );
}

export async function recordStockCredits(apiKey: string, response: Response) {
    const left = response.headers?.get('api-credits-left');
    const used = response.headers?.get('api-credits-used');
    if (left == null || used == null) return;
    const remaining = Number(left);
    const limit = remaining + Number(used);
    if (!Number.isFinite(remaining) || !Number.isFinite(limit) || remaining < 0 || limit < 1)
        return;
    await setCache(
        `${scope(apiKey)}:budget`,
        { window: Math.floor(Date.now() / 60_000), remaining, limit },
        24 * 60 * 60 * 1000,
    );
}

export async function stockRateLimit(
    apiKey: string,
    message: string,
    retryHeader?: string | null,
): Promise<never> {
    const daily = /daily|per day|for the day|day limit/i.test(message);
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 1, 0);
    const seconds = Number(retryHeader);
    const blockedUntil = daily
        ? tomorrow.getTime()
        : Number.isFinite(seconds) && seconds > 0
          ? Date.now() + seconds * 1000
          : nextMinute();
    const current = await getCache<Budget>(`${scope(apiKey)}:budget`);
    await setCache(
        `${scope(apiKey)}:budget`,
        {
            window: Math.floor(Date.now() / 60_000),
            remaining: 0,
            limit: current?.limit ?? DEFAULT_LIMIT,
            blockedUntil,
        },
        24 * 60 * 60 * 1000,
    );
    throw new StockPendingError(
        blockedUntil,
        daily
            ? 'The daily Twelve Data limit is reached; loading will resume after its reset'
            : undefined,
    );
}
