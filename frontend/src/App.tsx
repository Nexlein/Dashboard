import { useTranslation } from 'react-i18next';
import { Suspense, lazy, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    BrowserRouter as Router,
    Navigate,
    Route,
    Routes,
    useNavigate,
    useLocation,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { logout } from '@/lib/auth';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { CookieBanner } from '@/components/CookieBanner';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AccessibilityMenu } from '@/components/AccessibilityMenu';
import { Loader2 } from 'lucide-react';

const loadDashboardGrid = () => import('@/features/widgets/components/DashboardGrid');
const DashboardGrid = lazy(loadDashboardGrid);
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));

function AuthenticatedShell({
    children,
    showWidgetConfigurator = false,
}: {
    children: ReactNode;
    showWidgetConfigurator?: boolean;
}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const { t } = useTranslation('common');

    async function handleLogout() {
        await logout().catch(() => {});
        // Drop every cached response of this user before showing the login page.
        queryClient.clear();
        navigate('/login', { replace: true });
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
            {/* First focusable element: keyboard users jump over the navigation. */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
            >
                {t('skipToContent')}
            </a>
            <Navbar
                user={user || null}
                onLogout={handleLogout}
                showWidgetConfigurator={showWidgetConfigurator}
            />
            {children}
        </div>
    );
}

function Dashboard() {
    const { t } = useTranslation('common');
    return (
        <AuthenticatedShell showWidgetConfigurator>
            <main id="main-content" tabIndex={-1} className="outline-none">
                <h1 className="sr-only">{t('dashboard')}</h1>
                <DashboardGrid />
            </main>
        </AuthenticatedShell>
    );
}

function Services() {
    return (
        <AuthenticatedShell>
            <ServicesPage />
        </AuthenticatedShell>
    );
}

/** Administrators only; anyone else is sent to the dashboard (the API refuses them anyway). */
function Admin() {
    const { data: user } = useCurrentUser();
    if (!user) return <PageFallback />;
    if (user.role !== 'admin') return <Navigate to="/" replace />;
    return (
        <AuthenticatedShell>
            <AdminPage currentUser={user} />
        </AuthenticatedShell>
    );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isPending, isError } = useCurrentUser();
    if (isPending) return <PageFallback />;
    return isError ? <Navigate to="/login" replace /> : children;
}

function PageFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

/** Each page's own browser tab title, which screen readers announce on navigation. */
const PAGE_TITLES = {
    '/services': 'services',
    '/admin': 'administration',
    '/login': 'pageTitle.login',
    '/register': 'pageTitle.register',
    '/forgot-password': 'pageTitle.forgotPassword',
    '/cgu': 'pageTitle.terms',
    '/privacy': 'pageTitle.privacy',
} as const;

/** All routes; wrapped in a router by App (BrowserRouter) or by tests (MemoryRouter). */
export function AppRoutes() {
    const { t } = useTranslation('common');
    const { pathname } = useLocation();
    // Fetch the dashboard code while the session check is in flight, rather than after it.
    useEffect(() => {
        if (pathname === '/') void loadDashboardGrid().catch(() => {});
    }, [pathname]);
    const titleKey = Object.hasOwn(PAGE_TITLES, pathname)
        ? PAGE_TITLES[pathname as keyof typeof PAGE_TITLES]
        : undefined;
    const pageTitle = titleKey ? t(titleKey) : '';
    useEffect(() => {
        document.title = pageTitle ? `${pageTitle} · Dashboard` : 'Dashboard';
    }, [pageTitle]);
    const publicPage = !['/', '/services', '/admin'].includes(pathname);
    return (
        <>
            {publicPage && (
                <nav
                    aria-label={t('language.label')}
                    className="flex justify-end gap-2 border-b border-border bg-card px-4 py-2"
                >
                    <AccessibilityMenu />
                    <LanguageSwitcher />
                </nav>
            )}
            <Suspense fallback={<PageFallback />}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/services"
                        element={
                            <ProtectedRoute>
                                <Services />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <Admin />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/register" element={<AuthPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/cgu" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                </Routes>
            </Suspense>
            <CookieBanner />
        </>
    );
}

export default function App() {
    return (
        <Router>
            <AppRoutes />
        </Router>
    );
}
