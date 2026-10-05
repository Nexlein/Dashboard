import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '@/lib/apiClient';
import { mockApi } from '@/test/fixtures';
import { AppRoutes } from './App';

function validToken() {
    const payload = btoa(JSON.stringify({ userId: 1, exp: Math.floor(Date.now() / 1000) + 3600 }));
    return `header.${payload.replace(/=+$/, '')}.signature`;
}

function CurrentPath() {
    return <output data-testid="path">{useLocation().pathname}</output>;
}

function renderAppAt(path: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[path]}>
                <AppRoutes />
                <CurrentPath />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}
const currentPath = () => screen.getByTestId('path').textContent;

afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
});

describe('App routing', () => {
    it('sends visitors without a session to the login page', async () => {
        mockApi({});
        renderAppAt('/');
        expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
        expect(currentPath()).toBe('/login');
    });

    it('shows the dashboard to a signed-in user', async () => {
        localStorage.setItem(AUTH_TOKEN_KEY, validToken());
        mockApi({
            'GET /auth/me': { body: { id: 1, email: 'ada@example.com', displayName: 'Ada' } },
            'GET /widgets': { body: [] },
        });
        renderAppAt('/');
        expect(await screen.findByText('Ada')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('signs out when the API rejects the stored session', async () => {
        localStorage.setItem(AUTH_TOKEN_KEY, validToken());
        mockApi({
            'GET /auth/me': { status: 401, body: { error: 'Invalid token' } },
            'GET /widgets': { status: 401, body: { error: 'Invalid token' } },
        });
        renderAppAt('/services');
        await waitFor(() => expect(currentPath()).toBe('/login'));
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });

    it('serves the privacy policy without a session', async () => {
        mockApi({});
        renderAppAt('/privacy');
        expect(
            await screen.findByRole('heading', { level: 1, name: 'Privacy Policy (RGPD / GDPR)' }),
        ).toBeInTheDocument();
        expect(currentPath()).toBe('/privacy');
    });
});
