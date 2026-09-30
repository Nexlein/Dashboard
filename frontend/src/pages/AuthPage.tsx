import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, CheckCircle2, CloudSun, LayoutDashboard, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Github } from '@/components/ui/Github';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, register, startGitHubLogin } from '@/lib/auth';
import { cn } from '@/lib/utils';

function DashboardBackdrop() {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#f4f6f8_45%,#e8edf2_100%)]"
        >
            <div className="auth-glow auth-glow-primary absolute -left-24 -top-28 size-[28rem] rounded-full bg-sky-300/25 blur-3xl" />
            <div className="auth-glow auth-glow-secondary absolute -bottom-40 -right-20 size-[32rem] rounded-full bg-violet-300/20 blur-3xl" />

            <div className="auth-dashboard-scene absolute left-1/2 top-1/2 h-[760px] w-[1180px] -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] overflow-hidden rounded-[2rem] border border-white/90 bg-white/75 shadow-[0_40px_120px_-30px_rgba(15,23,42,0.3)] backdrop-blur-sm">
                <div className="flex h-[76px] items-center border-b border-slate-200/80 bg-white/85 px-8">
                    <div className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                            <LayoutDashboard className="size-4" />
                        </span>
                        Dashboard
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <div className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-lg shadow-slate-900/10">
                            <Plus className="size-4" />
                            Add Widget
                        </div>
                        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
                            <span className="flex size-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-semibold text-white">
                                U
                            </span>
                            Mon espace
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-5 p-8">
                    <div className="col-span-7 h-64 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Vue d’ensemble</p>
                                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                                    12 480
                                </p>
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <BarChart3 className="size-5" />
                            </span>
                        </div>
                        <div className="mt-9 flex h-28 items-end gap-3 border-b border-slate-100">
                            {[42, 68, 51, 84, 62, 94, 74, 88, 66, 98].map((height, index) => (
                                <span
                                    key={index}
                                    className="auth-chart-bar flex-1 rounded-t-md bg-slate-800/80"
                                    style={{
                                        height: `${height}%`,
                                        animationDelay: `${index * 90}ms`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="col-span-5 h-64 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Météo</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">
                                    Aujourd’hui
                                </p>
                            </div>
                            <CloudSun className="size-9 text-amber-500" />
                        </div>
                        <div className="mt-8 flex items-end gap-3">
                            <span className="text-6xl font-semibold tracking-tighter text-slate-900">
                                21°
                            </span>
                            <span className="mb-2 text-sm text-slate-500">Ensoleillé</span>
                        </div>
                        <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="auth-shimmer h-full w-3/4 rounded-full bg-gradient-to-r from-amber-300 to-orange-400" />
                        </div>
                    </div>

                    <div className="col-span-4 h-48 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Github className="size-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">GitHub</p>
                                <p className="text-xs text-slate-500">Activité récente</p>
                            </div>
                        </div>
                        <div className="mt-8 grid grid-cols-8 gap-1.5">
                            {Array.from({ length: 32 }, (_, index) => (
                                <span
                                    key={index}
                                    className={cn(
                                        'aspect-square rounded-sm',
                                        index % 5 === 0
                                            ? 'bg-emerald-500/80'
                                            : index % 3 === 0
                                              ? 'bg-emerald-300/70'
                                              : 'bg-slate-100',
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="col-span-8 h-48 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                                    <Activity className="size-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900">Services</p>
                                    <p className="text-xs text-slate-500">État en temps réel</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="size-4" />
                                Opérationnel
                            </span>
                        </div>
                        <div className="mt-8 space-y-3">
                            {[78, 91, 64].map((width, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <span
                                            className="block h-full rounded-full bg-slate-300"
                                            style={{ width: `${width}%` }}
                                        />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.1),rgba(255,255,255,0.72)_47%,rgba(255,255,255,0.18))]" />
        </div>
    );
}

export default function AuthPage() {
    const location = useLocation();
    const navigate = useNavigate();
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
                    displayName: String(formData.get('displayName') ?? '').trim() || undefined,
                    email,
                    password,
                    cguAccepted,
                    is16OrOlder,
                });
                navigate('/login', {
                    replace: true,
                    state: { registered: true, email },
                });
                return;
            }

            await login({ email, password });
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
            <DashboardBackdrop />

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
