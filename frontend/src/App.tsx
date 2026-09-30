import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import DashboardGrid from '@/components/DashboardGrid';
import { getCurrentUser, hasValidAuthToken, logout } from '@/lib/auth';
import AuthPage from '@/pages/AuthPage';
import TermsPage from '@/pages/TermsPage';
import ServicesPage from '@/pages/ServicesPage';
import PrivacyPage from '@/pages/PrivacyPage';
import { CookieBanner } from '@/components/CookieBanner';

import { useStore } from '@/store/useStore';
import { fetchWidgets, toDashboardWidget, type ApiWidget } from '@/lib/widgets';

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
    const navigate = useNavigate();
    const setWidgets = useStore((state) => state.setWidgets);

    const {
        data: apiWidgets,
        isError,
        isSuccess,
    } = useQuery({
        queryKey: ['widgets'],
        queryFn: fetchWidgets,
        retry: false,
    });

    useEffect(() => {
        if (isSuccess && apiWidgets) {
            setWidgets(apiWidgets.map((widget: ApiWidget) => toDashboardWidget(widget)));
        }
    }, [isSuccess, apiWidgets, setWidgets]);

    useEffect(() => {
        if (isError) {
            logout();
            navigate('/login', { replace: true });
        }
    }, [isError, navigate]);

    return (
        <AuthenticatedShell showWidgetConfigurator>
            <DashboardGrid />
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

function OAuthCallback() {
    const navigate = useNavigate();
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
            localStorage.setItem('dashboard-auth-token', token);
            navigate('/', { replace: true });
        } else {
            navigate('/login', { replace: true });
        }
    }, [navigate]);
    return <div>Connexion en cours...</div>;
}

export default function App() {
    return (
        <Router>
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
                <Route path="/login/oauth" element={<OAuthCallback />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/cgu" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
            </Routes>
            <CookieBanner />
        </Router>
    );
}
