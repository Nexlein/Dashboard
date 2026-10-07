import { getErrorMessage, notice, translateNotice, type LocalizedNotice } from '@/i18n/errors';
import { useTranslation } from 'react-i18next';
import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resendVerificationCode, verifyEmailCode } from '@/lib/auth';

type EmailCodeFormProps = {
    email: string;
    /** Called once the code is accepted: the user is signed in. */
    onVerified: () => void;
};

/** Asks for the 6-digit code emailed to `email` after sign-up or an unverified sign-in. */
export function EmailCodeForm({ email, onVerified }: EmailCodeFormProps) {
    const { t } = useTranslation('auth');
    const [code, setCode] = useState('');
    const [error, setError] = useState<unknown>('');
    const [info, setInfo] = useState<LocalizedNotice | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setInfo(null);
        setBusy(true);
        try {
            await verifyEmailCode(email, code.trim());
            onVerified();
        } catch (verifyError) {
            setError(verifyError);
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setError('');
        setInfo(null);
        try {
            await resendVerificationCode(email);
            setInfo(notice('auth:newCodeSent'));
        } catch (resendError) {
            setError(resendError);
        }
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="text-sm text-muted-foreground">{t('verificationSent', { email })}</p>
            <div className="space-y-2">
                <Label htmlFor="verification-code">{t('verificationCode')}</Label>
                <Input
                    id="verification-code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                    required
                />
            </div>
            {Boolean(error) && (
                <p className="text-sm text-destructive" role="alert">
                    {getErrorMessage(error)}
                </p>
            )}
            {info && (
                <p className="text-sm text-muted-foreground" role="status">
                    {translateNotice(info)}
                </p>
            )}
            <Button className="h-10 w-full" type="submit" disabled={busy || code.length !== 6}>
                {busy ? t('checking') : t('verify')}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={resend}>
                {t('resendCode')}
            </Button>
        </form>
    );
}
