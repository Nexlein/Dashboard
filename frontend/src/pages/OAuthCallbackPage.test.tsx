import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AUTH_TOKEN_KEY } from '@/lib/apiClient';
import OAuthCallbackPage from './OAuthCallbackPage';

function renderAt(url: string) {
    render(
        <MemoryRouter initialEntries={[url]}>
            <Routes>
                <Route path="/login/oauth" element={<OAuthCallbackPage />} />
                <Route path="/" element={<p>Dashboard home</p>} />
                <Route path="/login" element={<p>Login page</p>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('OAuthCallbackPage', () => {
    afterEach(() => localStorage.clear());

    it('stores the token from the URL fragment and opens the dashboard', async () => {
        renderAt('/login/oauth#token=header.payload.signature');
        expect(await screen.findByText('Dashboard home')).toBeInTheDocument();
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('header.payload.signature');
    });

    it('ignores a token sent in the query string', async () => {
        renderAt('/login/oauth?token=leaked');
        expect(await screen.findByText('Login page')).toBeInTheDocument();
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    });
});
