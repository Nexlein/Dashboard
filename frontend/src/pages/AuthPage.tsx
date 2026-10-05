import { AuthBackground } from '@/features/auth/components/AuthBackground';
import { LayoutDashboard } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Github } from '@/components/ui/Github';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, register, startGitHubLogin } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_KEY } from '@/features/auth/hooks/useCurrentUser';

export default function AuthPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { pathname } = location;
    const isRegister = pathname === '/register';
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cguAccepted, setCguAccepted] = useState(false);
    const [is16OrOlder, setIs16OrOlder] = useState(false);
    const registrationRequired =
        new URLSearchParams(location.search).get('error') === 'github_registration_requirements';

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get('email') ?? '').trim();
        const password = String(formData.get('password') ?? '');

        try {
            if (isRegister) {
                await register({
                    displayName: String(formData.get('displayName') ?? '').trim(),
                    email,
                    password,
                    cguAccepted: cguAccepted as true,
                    is16OrOlder: is16OrOlder as true,
                });
                navigate('/login', {
                    replace: true,
                    state: { registered: true, email },
                });
                return;
            }

            await login({ email, password });
            // A previous visit may have cached the signed-out answer of /auth/me.
            queryClient.removeQueries({ queryKey: CURRENT_USER_KEY });
            navigate('/', { replace: true });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Une erreur est survenue. Réessayez plus tard.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-8">
            <AuthBackground />

            <Card className="relative z-10 my-4 w-full max-w-md border-white/80 bg-white/88 shadow-[0_28px_90px_-24px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
                <CardHeader className="items-center pb-4 text-center">
                    <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <LayoutDashboard className="size-5" />
                    </div>
                    <CardTitle>
                        {isRegister ? 'Créer votre compte' : 'Bon retour parmi nous'}
                    </CardTitle>
                    <CardDescription>
                        {isRegister
                            ? 'Créez un compte pour personnaliser votre dashboard.'
                            : 'Connectez-vous pour retrouver votre dashboard.'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
                        <Link
                            to="/login"
                            className={cn(
                                'rounded-md px-3 py-2 text-center font-medium transition-colors',
                                !isRegister
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Connexion
                        </Link>
                        <Link
                            to="/register"
                            className={cn(
                                'rounded-md px-3 py-2 text-center font-medium transition-colors',
                                isRegister
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Inscription
                        </Link>
                    </div>

                    {registrationRequired && (
                        <p className="mb-4 text-sm text-destructive" role="alert">
                            Pour créer un compte avec GitHub, acceptez les conditions et confirmez
                            avoir 16 ans ou plus, puis cliquez sur « Continuer avec GitHub ».
                        </p>
                    )}
                    {location.state?.registered && (
                        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm" role="status">
                            Compte créé. Vous pouvez maintenant vous connecter.
                        </p>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        className="mb-4 h-10 w-full"
                        onClick={() => {
                            if (isRegister && (!cguAccepted || !is16OrOlder)) {
                                setError(
                                    'Acceptez les conditions et confirmez avoir 16 ans ou plus avant de continuer avec GitHub.',
                                );
                                return;
                            }
                            startGitHubLogin(isRegister ? { cguAccepted, is16OrOlder } : undefined);
                        }}
                    >
                        <Github className="mr-2 size-4" />
                        Continuer avec GitHub
                    </Button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white/88 px-2 text-muted-foreground">Ou</span>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <Label htmlFor="displayName">Nom d’affichage</Label>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                        Facultatif
                                    </span>
                                </div>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    type="text"
                                    autoComplete="name"
                                    maxLength={50}
                                    placeholder="Votre pseudo"
                                    aria-describedby="displayName-help"
                                />
                                <p id="displayName-help" className="text-xs text-muted-foreground">
                                    Utilisé uniquement pour personnaliser votre espace.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Adresse e-mail</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="vous@exemple.fr"
                                defaultValue={location.state?.email ?? ''}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                                minLength={isRegister ? 8 : undefined}
                                maxLength={isRegister ? 72 : undefined}
                                aria-describedby={isRegister ? 'password-help' : undefined}
                                required
                            />
                            {isRegister && (
                                <p id="password-help" className="text-xs text-muted-foreground">
                                    Entre 8 et 72 caractères.
                                </p>
                            )}
                        </div>

                        {isRegister && (
                            <div className="space-y-3">
                                <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                                    <input
                                        name="cguAccepted"
                                        checked={cguAccepted}
                                        onChange={(event) => setCguAccepted(event.target.checked)}
                                        type="checkbox"
                                        required
                                        className="mt-0.5 size-4 rounded border-input accent-foreground"
                                    />
                                    <span>
                                        J’accepte les{' '}
                                        <Link
                                            className="font-medium text-foreground underline underline-offset-4"
                                            to="/cgu"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            conditions générales d’utilisation
                                        </Link>
                                        .
                                    </span>
                                </label>
                                <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                                    <input
                                        name="is16OrOlder"
                                        checked={is16OrOlder}
                                        onChange={(event) => setIs16OrOlder(event.target.checked)}
                                        type="checkbox"
                                        required
                                        className="mt-0.5 size-4 rounded border-input accent-foreground"
                                    />
                                    <span>Je confirme avoir 16 ans ou plus.</span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        )}

                        <Button className="h-10 w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? 'Chargement…'
                                : isRegister
                                  ? 'Créer mon compte'
                                  : 'Se connecter'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </main>
    );
}
