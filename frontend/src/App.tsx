import './index.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import api from './lib/api';
import type { CurrentUser } from './types/forum';

// Pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WritingPage from './pages/WritingPage';
import ReadPage from './pages/ReadPage';
import OtherProfilePage from './pages/OtherProfilePage';
import CategoryPage from './pages/Category';
import AnalyticsPage from './pages/AnalyticsPage';
import Login from './pages/Login';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

function MainLayout({ user, children }: { user: CurrentUser | null, children: React.ReactNode }) {
    const location = useLocation();

    const getActivePage = () => {
        const path = location.pathname;
        if (path === '/') return 'home';
        if (path === '/category') return 'category';
        if (path === '/write') return 'write';
        if (path === '/profile') return 'profile';
        if (path === '/analytics') return 'analytics';
        return '';
    };

    return (
        <div className="bg-[#0f0f0f] min-h-screen flex">
            <Sidebar active={getActivePage()} />

            <div className="flex-grow flex flex-col min-w-0">
                <div className="pl-20">
                    <Navbar user={user} />
                </div>

                <main className="pl-20 w-full overflow-x-hidden">
                    <div className="max-w-5xl mx-auto p-6 md:p-12">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<CurrentUser>('/api/user/me')
            .then(res => setUser(res.data))
            .catch(() => {
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-full bg-[#050505] flex items-center justify-center text-[#e60000] font-mono tracking-widest uppercase">
                Initializing_System...
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login user={user} setUser={setUser} />} />

                <Route path="/*" element={
                    <MainLayout user={user}>
                        <Routes>
                            <Route path="/" element={user ? <HomePage user={user}/> : <Navigate to="/login" replace />} />
                            <Route path="/category" element={user ? <CategoryPage user={user} /> : <Navigate to="/login" replace />} />
                            <Route path="/profile" element={user ? <ProfilePage user={user} /> : <Navigate to="/login" replace />} />
                            <Route path="/write" element={user ? <WritingPage user={user} /> : <Navigate to="/login" replace />} />
                            <Route path="/analytics" element={user ? <AnalyticsPage user={user} /> : <Navigate to="/login" replace />} />

                            <Route path="/read/:id" element={<ReadPage user={user} />} />
                            <Route path="/profile/:userId" element={<OtherProfilePage user={user} />} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}
