import { KeyRound } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthBackground } from '@/features/auth/components/AuthBackground';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, resetPassword } from '@/lib/auth';

const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez plus tard.';

/** Forgotten password: a code by email, then a new password (every session is signed out). */
export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    // Set once the code has been requested: the second step asks for it.
    const [email, setEmail] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function run(action: () => Promise<void>) {
        setError('');
        setBusy(true);
        try {
            await action();
        } catch (actionError) {
            setError(errorMessage(actionError));
        } finally {
            setBusy(false);
        }
    }

    function handleRequest(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const address = String(new FormData(event.currentTarget).get('email') ?? '').trim();
        return run(async () => {
            await requestPasswordReset(address);
            setEmail(address);
        });
    }

    function handleReset(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const code = String(form.get('code') ?? '').trim();
        const password = String(form.get('password') ?? '');
        return run(async () => {
            await resetPassword(email!, code, password);
            navigate('/login', { replace: true, state: { passwordReset: true, email } });
        });
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
            <AuthBackground />
            <Card className="relative z-10 my-4 w-full max-w-md border-white/80 bg-white/88 shadow-[0_28px_90px_-24px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
                <CardHeader className="items-center pb-4 text-center">
                    <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <KeyRound className="size-5" />
                    </div>
                    <CardTitle>Mot de passe oublié</CardTitle>
                    <CardDescription>
                        {email
                            ? 'Saisissez le code reçu et choisissez un nouveau mot de passe.'
                            : 'Nous vous enverrons un code pour choisir un nouveau mot de passe.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {email ? (
                        <form className="space-y-4" onSubmit={handleReset}>
                            <p className="text-sm text-muted-foreground" role="status">
                                Si un compte utilise{' '}
                                <span className="font-medium text-foreground">{email}</span>, un
                                code à 6 chiffres vient de lui être envoyé. Il expire dans 5
                                minutes.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="reset-code">Code reçu par e-mail</Label>
                                <Input
                                    id="reset-code"
                                    name="code"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                                <Input
                                    id="new-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    aria-describedby="new-password-help"
                                    required
                                />
                                <p id="new-password-help" className="text-xs text-muted-foreground">
                                    Entre 8 et 128 caractères. Vos autres sessions seront
                                    déconnectées.
                                </p>
                            </div>
                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}
                            <Button className="h-10 w-full" type="submit" disabled={busy}>
                                {busy ? 'Chargement…' : 'Changer le mot de passe'}
                            </Button>
                        </form>
                    ) : (
                        <form className="space-y-4" onSubmit={handleRequest}>
                            <div className="space-y-2">
                                <Label htmlFor="email">Adresse e-mail</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="vous@exemple.fr"
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}
                            <Button className="h-10 w-full" type="submit" disabled={busy}>
                                {busy ? 'Chargement…' : 'Recevoir un code'}
                            </Button>
                        </form>
                    )}
                    <p className="mt-6 text-center text-sm">
                        <Link
                            to="/login"
                            className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                            Retour à la connexion
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
