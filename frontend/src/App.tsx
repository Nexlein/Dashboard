import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import DashboardGrid from '@/components/DashboardGrid';
import { getCurrentUser, hasValidAuthToken, logout, type AuthUser } from '@/lib/auth';
import AuthPage from '@/pages/AuthPage';
import TermsPage from '@/pages/TermsPage';
import ServicesPage from '@/pages/ServicesPage';
import PrivacyPage from '@/pages/PrivacyPage';
import { CookieBanner } from '@/components/CookieBanner';

import { useStore } from '@/store/useStore';

function AuthenticatedShell({
    children,
    showWidgetConfigurator = false,
}: {
    children: ReactNode;
    showWidgetConfigurator?: boolean;
}) {
    const navigate = useNavigate();
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        let isActive = true;

        getCurrentUser()
            .then((profile) => {
                if (isActive) setUser(profile);
            })
            .catch(() => {
                if (!isActive) return;
                logout();
                navigate('/login', { replace: true });
            });

        return () => {
            isActive = false;
        };
    }, [navigate]);

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
            <Navbar
                user={user}
                onLogout={handleLogout}
                showWidgetConfigurator={showWidgetConfigurator}
            />
            {children}
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const fetchWidgetsAsync = useStore((state) => state.fetchWidgetsAsync);

    useEffect(() => {
        fetchWidgetsAsync().catch(() => {
            logout();
            navigate('/login', { replace: true });
        });
    }, [navigate, fetchWidgetsAsync]);

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
