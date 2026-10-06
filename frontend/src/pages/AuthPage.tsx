import { getErrorMessage, notice } from '@/i18n/errors';
import i18n from '@/i18n';
import { Trans, useTranslation } from 'react-i18next';
import { AuthBackground } from '@/features/auth/components/AuthBackground';
import { EmailCodeForm } from '@/features/auth/components/EmailCodeForm';
import { LayoutDashboard } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
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

/** Messages for the `error` codes GitHub sign-in sends back (see backend/src/auth.ts). */
const GITHUB_ERRORS: Record<string, string> = {
    get REGISTRATION_REQUIREMENTS() {
        return i18n.t('auth:githubRequirements');
    },
    get signup_disabled() {
        return i18n.t('auth:githubNoAccount');
    },
    get account_not_linked() {
        return i18n.t('auth:githubExistingAccount');
    },
    get EMAIL_NOT_VERIFIED() {
        return i18n.t('auth:githubVerifiedEmail');
    },
};

export default function AuthPage() {
    useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { pathname } = location;
    const isRegister = pathname === '/register';
    const [error, setError] = useState<unknown>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cguAccepted, setCguAccepted] = useState(false);
    const [is16OrOlder, setIs16OrOlder] = useState(false);
    const githubError = new URLSearchParams(location.search).get('error');
    // Address waiting for its emailed code (after sign-up, or an unverified sign-in).
    const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);

    function finishSignIn() {
        // A previous visit may have cached the signed-out session.
        queryClient.removeQueries({ queryKey: CURRENT_USER_KEY });
        navigate('/', { replace: true });
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get('email') ?? '').trim();
        const password = String(formData.get('password') ?? '');

        try {
            if (isRegister) {
                await register({
                    name: String(formData.get('displayName') ?? '').trim(),
                    email,
                    password,
                    cguAccepted: cguAccepted as true,
                    is16OrOlder: is16OrOlder as true,
                });
                // The account signs in once the emailed code is entered.
                setVerifyingEmail(email);
                return;
            }
            await login({ email, password });
            finishSignIn();
        } catch (requestError) {
            // The API emailed a new code: ask for it.
            if ((requestError as { code?: string }).code === 'EMAIL_NOT_VERIFIED') {
                setVerifyingEmail(email);
                return;
            }
            setError(requestError);
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
                        {verifyingEmail
                            ? i18n.t('auth:verifyAddress')
                            : isRegister
                              ? i18n.t('auth:createTitle')
                              : i18n.t('auth:welcomeTitle')}
                    </CardTitle>
                    <CardDescription>
                        {verifyingEmail
                            ? i18n.t('auth:verifySubtitle')
                            : isRegister
                              ? i18n.t('auth:createSubtitle')
                              : i18n.t('auth:loginSubtitle')}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {verifyingEmail ? (
                        <EmailCodeForm email={verifyingEmail} onVerified={finishSignIn} />
                    ) : (
                        <>
                            <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
                                <Link
                                    to="/login"
                                    className={cn(
                                        'rounded-md px-3 py-2 text-center font-medium transition-colors',
                                        !isRegister
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {i18n.t('auth:loginTab')}
                                </Link>
                                <Link
                                    to="/register"
                                    className={cn(
                                        'rounded-md px-3 py-2 text-center font-medium transition-colors',
                                        isRegister
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {i18n.t('auth:registerTab')}
                                </Link>
                            </div>

                            {location.state?.passwordReset && (
                                <p
                                    className="mb-4 rounded-md bg-muted px-3 py-2 text-sm"
                                    role="status"
                                >
                                    {i18n.t('auth:passwordChanged')}
                                </p>
                            )}
                            {githubError && (
                                <p className="mb-4 text-sm text-destructive" role="alert">
                                    {Object.hasOwn(GITHUB_ERRORS, githubError)
                                        ? GITHUB_ERRORS[githubError]
                                        : i18n.t('auth:githubError')}
                                </p>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                className="mb-4 h-10 w-full"
                                onClick={() => {
                                    if (isRegister && (!cguAccepted || !is16OrOlder)) {
                                        setError(notice('auth:githubConsent'));
                                        return;
                                    }
                                    setError('');
                                    startGitHubLogin(
                                        isRegister ? { cguAccepted, is16OrOlder } : undefined,
                                    ).catch((githubStartError: unknown) =>
                                        setError(githubStartError),
                                    );
                                }}
                            >
                                <Github className="mr-2 size-4" />
                                {i18n.t('auth:continueGithub')}
                            </Button>

                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white/88 px-2 text-muted-foreground">
                                        {i18n.t('auth:or')}
                                    </span>
                                </div>
                            </div>

                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {isRegister && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <Label htmlFor="displayName">
                                                {i18n.t('auth:displayName')}
                                            </Label>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                {i18n.t('auth:optional')}
                                            </span>
                                        </div>
                                        <Input
                                            id="displayName"
                                            name="displayName"
                                            type="text"
                                            autoComplete="name"
                                            maxLength={50}
                                            placeholder={i18n.t('auth:namePlaceholder')}
                                            aria-describedby="displayName-help"
                                        />
                                        <p
                                            id="displayName-help"
                                            className="text-xs text-muted-foreground"
                                        >
                                            {i18n.t('auth:nameHint')}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">{i18n.t('auth:email')}</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder={i18n.t('auth:emailPlaceholder')}
                                        defaultValue={location.state?.email ?? ''}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label htmlFor="password">{i18n.t('auth:password')}</Label>
                                        {!isRegister && (
                                            <Link
                                                to="/forgot-password"
                                                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                            >
                                                {i18n.t('auth:forgotLink')}
                                            </Link>
                                        )}
                                    </div>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete={
                                            isRegister ? 'new-password' : 'current-password'
                                        }
                                        minLength={isRegister ? 8 : undefined}
                                        maxLength={isRegister ? 128 : undefined}
                                        aria-describedby={isRegister ? 'password-help' : undefined}
                                        required
                                    />
                                    {isRegister && (
                                        <p
                                            id="password-help"
                                            className="text-xs text-muted-foreground"
                                        >
                                            {i18n.t('auth:passwordHint')}
                                        </p>
                                    )}
                                </div>

                                {isRegister && (
                                    <div className="space-y-3">
                                        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                                            <input
                                                name="cguAccepted"
                                                checked={cguAccepted}
                                                onChange={(event) =>
                                                    setCguAccepted(event.target.checked)
                                                }
                                                type="checkbox"
                                                required
                                                className="mt-0.5 size-4 rounded border-input accent-foreground"
                                            />
                                            <span>
                                                <Trans
                                                    ns="auth"
                                                    i18nKey="acceptTerms"
                                                    components={{
                                                        terms: (
                                                            <Link
                                                                className="font-medium text-foreground underline underline-offset-4"
                                                                to="/cgu"
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            />
                                                        ),
                                                    }}
                                                />
                                            </span>
                                        </label>
                                        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                                            <input
                                                name="is16OrOlder"
                                                checked={is16OrOlder}
                                                onChange={(event) =>
                                                    setIs16OrOlder(event.target.checked)
                                                }
                                                type="checkbox"
                                                required
                                                className="mt-0.5 size-4 rounded border-input accent-foreground"
                                            />
                                            <span>{i18n.t('auth:ageConfirmation')}</span>
                                        </label>
                                    </div>
                                )}

                                {Boolean(error) && (
                                    <p className="text-sm text-destructive" role="alert">
                                        {getErrorMessage(error)}
                                    </p>
                                )}

                                <Button
                                    className="h-10 w-full"
                                    type="submit"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? i18n.t('auth:loading')
                                        : isRegister
                                          ? i18n.t('auth:createAccount')
                                          : i18n.t('auth:login')}
                                </Button>
                            </form>
                        </>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
