import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import DashboardGrid from '@/components/DashboardGrid';

function Dashboard() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
            <Navbar />
            <DashboardGrid />
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Dashboard />} />
            </Routes>
        </Router>
    );
}
