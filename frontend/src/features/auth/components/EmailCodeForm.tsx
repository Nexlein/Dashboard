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

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez plus tard.';

/** Asks for the 6-digit code emailed to `email` after sign-up or an unverified sign-in. */
export function EmailCodeForm({ email, onVerified }: EmailCodeFormProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setInfo('');
        setBusy(true);
        try {
            await verifyEmailCode(email, code.trim());
            onVerified();
        } catch (verifyError) {
            setError(errorMessage(verifyError));
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setError('');
        setInfo('');
        try {
            await resendVerificationCode(email);
            setInfo('Un nouveau code vient d’être envoyé.');
        } catch (resendError) {
            setError(errorMessage(resendError));
        }
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <p className="text-sm text-muted-foreground">
                Nous avons envoyé un code à 6 chiffres à{' '}
                <span className="font-medium text-foreground">{email}</span>. Il expire dans 5
                minutes.
            </p>
            <div className="space-y-2">
                <Label htmlFor="verification-code">Code de vérification</Label>
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
            {error && (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            )}
            {info && (
                <p className="text-sm text-muted-foreground" role="status">
                    {info}
                </p>
            )}
            <Button className="h-10 w-full" type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Vérification…' : 'Vérifier'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={resend}>
                Renvoyer le code
            </Button>
        </form>
    );
}
