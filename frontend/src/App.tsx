import './index.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';

// Pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WritingPage from './pages/WritingPage';
import ReadPage from './pages/ReadPage';
import OtherProfilePage from './pages/OtherProfilePage';
import CategoryPage from './pages/Category';
import Login from './pages/Login'; // Pastikan file Login.tsx sudah ada

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

interface UserProps {
    name: string;
    email: string;
    picture?: string;
    userID?: string;
}

// 1. MAIN LAYOUT: Pembungkus khusus halaman yang butuh Sidebar & Navbar
function MainLayout({ user, children }: { user: UserProps | null, children: React.ReactNode }) {
    const location = useLocation();

    // Logika cerdas untuk menentukan ID aktif di Sidebar berdasarkan URL
    const getActivePage = () => {
        const path = location.pathname;
        if (path === '/') return 'home';
        if (path === '/category') return 'category';
        if (path === '/write') return 'stories';
        if (path === '/profile') return 'profile';
        return '';
    };

    return (
        <div className="bg-[#0f0f0f] min-h-screen flex">
            {/* SIDEBAR (Fixed di sisi kiri) */}
            <Sidebar active={getActivePage()} />

            {/* MAIN CONTAINER (Area kanan Sidebar) */}
            <div className="flex-grow flex flex-col min-w-0">
                {/* NAVBAR (Diberi padding-left 20 agar tidak tertutup sidebar) */}
                <div className="pl-20">
                    <Navbar user={user} />
                </div>

                {/* CONTENT AREA */}
                <main className="pl-20 w-full overflow-x-hidden">
                    <div className="max-w-5xl mx-auto p-6 md:p-12">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

// 2. APP: Mengatur State User dan Routing Utama
export default function App() {
    const [user, setUser] = useState<UserProps | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Cek LocalStorage untuk login manual terlebih dahulu
        const manualUser = localStorage.getItem('manualUser');
        if (manualUser) {
            setUser(JSON.parse(manualUser));
            setLoading(false);
            return; // Berhenti di sini, tidak perlu tembak API Google
        }

        // Jika tidak ada di LocalStorage, cek sesi OAuth2 dari Backend
        axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/api/user/me', { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => {
                console.warn("Unauthorized: User session not found.");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    // Layar transisi saat sistem mengecek status login
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
                {/* ROUTE PUBLIK: Halaman Login berdiri sendiri tanpa Layout */}
                <Route path="/login" element={<Login user={user} setUser={setUser} />} />

                {/* ROUTE BERSARANG: Semua halaman di bawah ini akan dibungkus MainLayout */}
                <Route path="/*" element={
                    <MainLayout user={user}>
                        <Routes>
                            {/* PROTEKSI ROUTE: Lempar ke /login jika user null */}
                            <Route path="/" element={user ? <HomePage user={user}/> : <Navigate to="/login" replace />} />
                            <Route path="/category" element={user ? <CategoryPage user={user} /> : <Navigate to="/login" replace />} />
                            <Route path="/profile" element={user ? <ProfilePage user={user} /> : <Navigate to="/login" replace />} />
                            <Route path="/write" element={user ? <WritingPage user={user} /> : <Navigate to="/login" replace />} />

                            {/* ROUTE TERBUKA: Halaman baca dan profil orang lain mungkin tidak butuh login? */}
                            <Route path="/read/:id" element={<ReadPage />} />
                            <Route path="/profile/:userId" element={<OtherProfilePage user={user} />} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}