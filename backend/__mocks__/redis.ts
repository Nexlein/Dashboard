import { vi } from 'vitest';

export const createClient = () => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(true),
    isReady: false,
});
