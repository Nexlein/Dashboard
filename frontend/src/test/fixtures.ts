import { vi } from 'vitest';
import type { User } from 'shared';
import type { ServiceConnection } from '@/features/services/lib/services';
import {
    toDashboardWidget,
    type ApiWidget,
    type DashboardWidget,
} from '@/features/widgets/lib/widgets';

/** A dashboard widget built through the real API mapping, so tests use the app's shape. */
export function makeWidget(overrides: Partial<ApiWidget> = {}): DashboardWidget {
    return toDashboardWidget({
        id: 1,
        serviceName: 'weather',
        widgetName: 'current_weather',
        params: {},
        refreshRate: 60,
        layout: { x: 0, y: 0, w: 4, h: 2 },
        ...overrides,
    });
}

export function makeUser(overrides: Partial<User> = {}): User {
    return { id: 42, email: 'user@example.com', name: '', ...overrides };
}

export function makeService(overrides: Partial<ServiceConnection> = {}): ServiceConnection {
    return {
        name: 'crypto',
        displayName: 'CoinGecko',
        description: 'Cryptocurrency prices and market history',
        configurable: true,
        connectionType: 'apiKey',
        credentialLabel: 'CoinGecko Demo API key',
        documentationUrl: 'https://www.coingecko.com/en/developers/dashboard',
        connected: false,
        keyHint: null,
        verifiedAt: null,
        ...overrides,
    };
}

type RouteHandler = (init: RequestInit) => unknown;
type Route = { status?: number; body?: unknown } | RouteHandler;

/**
 * Stubs fetch for the API: keys are "METHOD /path" (query string ignored), values are a
 * response or a handler receiving the request. Any other request fails the test, so a
 * component cannot silently call an endpoint the test did not expect.
 */
export function mockApi(routes: Record<string, Route>) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = new URL(String(input));
        const key = `${init.method ?? 'GET'} ${url.pathname}`;
        const route = routes[key];
        if (!route) throw new Error(`Unexpected API call: ${key}`);
        const { status = 200, body = {} } =
            typeof route === 'function' ? { body: route(init) } : route;
        return new Response(status === 204 ? null : JSON.stringify(body), { status });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}
