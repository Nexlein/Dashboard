import { useEffect, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import { getCurrentUser, hasValidAuthToken, logout } from '@/lib/auth';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';
import { CookieBanner } from '@/components/CookieBanner';
import { Loader2 } from 'lucide-react';

const DashboardGrid = lazy(() => import('@/features/widgets/components/DashboardGrid'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
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
    const { data: user, isError } = useQuery({
        queryKey: ['currentUser'],
        queryFn: getCurrentUser,
        retry: false,
    });

    useEffect(() => {
        if (isError) {
            logout();
            navigate('/login', { replace: true });
        }
    }, [isError, navigate]);

    function handleLogout() {
        logout();
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
    return hasValidAuthToken() ? children : <Navigate to="/login" replace />;
}

function PageFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

export default function App() {
    return (
        <Router>
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
                    <Route path="/login/oauth" element={<OAuthCallbackPage />} />
                    <Route path="/register" element={<AuthPage />} />
                    <Route path="/cgu" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                </Routes>
            </Suspense>
            <CookieBanner />
        </Router>
    );
}
