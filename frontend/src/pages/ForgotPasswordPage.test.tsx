import i18n from '@/i18n';
import { beforeEach as beforeLocaleTest } from 'vitest';
beforeLocaleTest(async () => {
    await i18n.changeLanguage('fr');
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';
import { requestPasswordReset, resetPassword } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
    requestPasswordReset: vi.fn(async () => {}),
    resetPassword: vi.fn(async () => {}),
}));
beforeEach(() => vi.clearAllMocks());

function LoginProbe() {
    const location = useLocation();
    return <p>login page {JSON.stringify(location.state)}</p>;
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/forgot-password']}>
            <Routes>
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/login" element={<LoginProbe />} />
            </Routes>
        </MemoryRouter>,
    );
}

async function requestCode(email = 'ada@example.com') {
    fireEvent.change(screen.getByLabelText('Adresse e-mail'), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir un code' }));
    await screen.findByLabelText('Code reçu par e-mail');
}

it('sends a code, then sets the new password and returns to the sign-in page', async () => {
    renderPage();
    await requestCode();
    expect(requestPasswordReset).toHaveBeenCalledWith('ada@example.com');
    // Same message whether or not the address has an account.
    expect(screen.getByRole('status')).toHaveTextContent('Si un compte utilise');

    fireEvent.change(screen.getByLabelText('Code reçu par e-mail'), {
        target: { value: '654321' },
    });
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
        target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));

    await waitFor(() =>
        expect(resetPassword).toHaveBeenCalledWith('ada@example.com', '654321', 'new-password-123'),
    );
    expect(await screen.findByText(/login page/)).toHaveTextContent('"passwordReset":true');
});

it('keeps the form and shows the error of a wrong code', async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(
        Object.assign(new Error('Invalid OTP'), { code: 'INVALID_OTP' }),
    );
    renderPage();
    await requestCode();
    fireEvent.change(screen.getByLabelText('Code reçu par e-mail'), {
        target: { value: '000000' },
    });
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), {
        target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Code de vérification invalide');
    expect(screen.getByLabelText('Code reçu par e-mail')).toBeInTheDocument();
});
