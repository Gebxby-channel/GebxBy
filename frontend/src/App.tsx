import './index.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import axios from 'axios';

// Pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WritingPage from './pages/WritingPage';
import ReadPage from './pages/ReadPage';
import OtherProfilePage from './pages/OtherProfilePage';
import CategoryPage from './pages/Category'; // Halaman Kategori Baru

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

interface UserProps {
    name: string;
    email: string;
    picture: string;
    userID: string;
}

function AppContent({ user }: { user: UserProps | null }) {
    const location = useLocation();

    // Logika cerdas untuk menentukan ID aktif di Sidebar berdasarkan URL
    const getActivePage = () => {
        const path = location.pathname;
        if (path === '/') return 'home';
        if (path === '/category') return 'category'; // ID untuk Sektor/Kategori
        if (path === '/write') return 'stories';
        if (path === '/profile') return 'profile';
        return '';
    };

    return (
        <div className="bg-[#0f0f0f] min-h-screen flex">
            {/* 1. SIDEBAR (Fixed di sisi kiri) */}
            <Sidebar active={getActivePage()} />

            {/* 2. MAIN CONTAINER (Area kanan Sidebar) */}
            <div className="flex-grow flex flex-col min-w-0">

                {/* 3. NAVBAR (Diberi padding-left 20 agar tidak tertutup sidebar) */}
                <div className="pl-20">
                    <Navbar user={user} />
                </div>

                {/* 4. CONTENT AREA */}
                <main className="pl-20 w-full overflow-x-hidden">
                    {/* Max-width 5xl menjaga konten tetap rapi di tengah ala Medium */}
                    <div className="max-w-5xl mx-auto p-6 md:p-12">
                        <Routes>
                            <Route path="/" element={<HomePage user={user}/>} />
                            <Route path="/category" element={<CategoryPage user={user} />} />
                            <Route path="/profile" element={<ProfilePage user={user} />} />
                            <Route path="/write" element={<WritingPage user={user} />} />
                            <Route path="/read/:id" element={<ReadPage />} />
                            <Route path="/profile/:userId" element={<OtherProfilePage user={user} />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState<UserProps | null>(null);

    // Inisialisasi Data User dari Backend
    useEffect(() => {
        axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/api/user/me', { withCredentials: true })
            .then(res => setUser(res.data))
            .catch(() => {
                console.warn("Unauthorized: User session not found.");
                setUser(null);
            });
    }, []);

    return (
        <Router>
            <AppContent user={user} />
        </Router>
    );
}