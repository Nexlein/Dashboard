import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { mockApi } from '@/test/fixtures';
import { AppRoutes } from './App';

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
        mockApi({
            'GET /api/auth/get-session': { body: null },
        });
        renderAppAt('/');
        expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(currentPath()).toBe('/login');
    });

    it('shows the dashboard to a signed-in user', async () => {
        mockApi({
            'GET /api/auth/get-session': {
                body: { user: { id: '1', email: 'ada@example.com', name: 'Ada' }, session: {} },
            },
            'GET /widgets': { body: [] },
        });
        renderAppAt('/');
        expect(await screen.findByText('Ada')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });

    it('opens the administration page to administrators only', async () => {
        mockApi({
            'GET /api/auth/get-session': {
                body: { user: { id: '1', email: 'ada@example.com', name: 'Ada' }, session: {} },
            },
            'GET /widgets': { body: [] },
        });
        renderAppAt('/admin');
        await waitFor(() => expect(currentPath()).toBe('/'));
        expect(screen.queryByRole('link', { name: 'Administration' })).toBeNull();
    });

    it('shows the administration page to an administrator', async () => {
        mockApi({
            'GET /api/auth/get-session': {
                body: {
                    user: { id: '1', email: 'ada@example.com', name: 'Ada', role: 'admin' },
                    session: {},
                },
            },
            'GET /api/auth/admin/list-users': { body: { users: [], total: 0 } },
        });
        renderAppAt('/admin');
        expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Administration' })).toBeInTheDocument();
    });

    it('sends a visitor with an expired session to the login page', async () => {
        mockApi({
            'GET /api/auth/get-session': { body: null },
            'GET /widgets': { status: 401, body: { error: 'Invalid token' } },
        });
        renderAppAt('/services');
        await waitFor(() => expect(currentPath()).toBe('/login'));
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
