import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuthPage from './AuthPage';
import { register, startGitHubLogin } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ register: vi.fn(), login: vi.fn(), startGitHubLogin: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
function renderPage(path = '/register') {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={[path]}>
                <AuthPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}
function confirmRegistration() {
    fireEvent.click(screen.getByRole('checkbox', { name: /conditions générales/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /16 ans/i }));
}

it('sends the age confirmation with password registration', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Adresse e-mail'), {
        target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'password123' } });
    confirmRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));
    await waitFor(() =>
        expect(register).toHaveBeenCalledWith(
            expect.objectContaining({ cguAccepted: true, is16OrOlder: true }),
        ),
    );
});

it('blocks GitHub registration until both checkboxes are accepted', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer avec GitHub' }));
    expect(startGitHubLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('16 ans');
    fireEvent.click(screen.getByRole('checkbox', { name: /conditions générales/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer avec GitHub' }));
    expect(startGitHubLogin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: /16 ans/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer avec GitHub' }));
    expect(startGitHubLogin).toHaveBeenCalledWith({ cguAccepted: true, is16OrOlder: true });
});

it('allows existing users to start GitHub login without registration checkboxes', () => {
    renderPage('/login');
    fireEvent.click(screen.getByRole('button', { name: 'Continuer avec GitHub' }));
    expect(startGitHubLogin).toHaveBeenCalledWith(undefined);
});

it('explains why a new GitHub user was redirected to registration', () => {
    renderPage('/register?error=github_registration_requirements');
    expect(screen.getByRole('alert').textContent).toContain('Pour créer un compte avec GitHub');
    expect((screen.getByRole('checkbox', { name: /16 ans/i }) as HTMLInputElement).checked).toBe(
        false,
    );
});
