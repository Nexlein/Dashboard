import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import DashboardGrid from '@/components/DashboardGrid';
import { getCurrentUser, hasValidAuthToken, logout, type AuthUser } from '@/lib/auth';
import AuthPage from '@/pages/AuthPage';
import TermsPage from '@/pages/TermsPage';

function Dashboard() {
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
            <Navbar user={user} onLogout={handleLogout} />
            <DashboardGrid />
        </div>
    );
}

function ProtectedDashboard() {
    return hasValidAuthToken() ? <Dashboard /> : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ProtectedDashboard />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage />} />
                <Route path="/cgu" element={<TermsPage />} />
            </Routes>
        </Router>
    );
}
