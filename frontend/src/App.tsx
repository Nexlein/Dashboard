import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { logout } from '@/lib/auth';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { CookieBanner } from '@/components/CookieBanner';
import { Loader2 } from 'lucide-react';

const DashboardGrid = lazy(() => import('@/features/widgets/components/DashboardGrid'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const ServicesPage = lazy(() => import('@/pages/ServicesPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));

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

    async function handleLogout() {
        await logout().catch(() => {});
        // Drop every cached response of this user before showing the login page.
        queryClient.clear();
        navigate('/login', { replace: true });
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
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
    return (
        <AuthenticatedShell showWidgetConfigurator>
            <main>
                <h1 className="sr-only">Dashboard</h1>
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

/** All routes; wrapped in a router by App (BrowserRouter) or by tests (MemoryRouter). */
export function AppRoutes() {
    return (
        <>
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
