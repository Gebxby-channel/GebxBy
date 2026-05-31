import './index.css';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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
import AdminPanelPage from './pages/AdminPanelPage';
import LogPage from './pages/LogPage';
import SettingsPage from './pages/SettingsPage';

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import BackgroundMusic from './components/BackgroundMusic';
import Footer from './components/Footer';
import { MUSIC_TRACKS } from './utils/musicLibrary';
import type { ThemeMode } from './types/forum';

function MainLayout({
    user,
    onLogout,
    children,
}: {
    user: CurrentUser | null;
    onLogout: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="terminal-grid bg-[#0f0f0f] min-h-screen flex">
            <div className="flex-grow flex flex-col min-w-0">
                <Navbar user={user} onLogout={onLogout} />

                <main className="w-full overflow-x-hidden">
                    <div className="max-w-5xl mx-auto p-6 md:p-12">
                        {children}
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<ThemeMode>(() => readThemePreference());
    const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('gebxby:music-enabled') === 'true');
    const [musicTrackId, setMusicTrackId] = useState(() => localStorage.getItem('gebxby:music-track') ?? MUSIC_TRACKS[0]?.id ?? '');

    useEffect(() => {
        api.get<CurrentUser>('/api/user/me')
            .then(res => setUser(res.data))
            .catch(() => {
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const becomeGuest = () => {
        setUser(null);
    };

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('gebxby:theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('gebxby:music-enabled', String(musicEnabled));
    }, [musicEnabled]);

    useEffect(() => {
        if (musicTrackId) {
            localStorage.setItem('gebxby:music-track', musicTrackId);
        }
    }, [musicTrackId]);

    if (loading) {
        return <LoadingSpinner fullScreen label="Initializing" />;
    }

    return (
        <Router>
            <BackgroundMusic enabled={musicEnabled} trackId={musicTrackId} />
            <Routes>
                <Route path="/login" element={<Login user={user} setUser={setUser} />} />

                <Route path="/*" element={
                    <MainLayout user={user} onLogout={becomeGuest}>
                        <Routes>
                            <Route path="/" element={<HomePage user={user} />} />
                            <Route path="/category" element={<CategoryPage user={user} />} />
                            <Route path="/settings" element={
                                <SettingsPage
                                    theme={theme}
                                    musicEnabled={musicEnabled}
                                    musicTrackId={musicTrackId}
                                    onThemeChange={setTheme}
                                    onMusicEnabledChange={setMusicEnabled}
                                    onMusicTrackChange={setMusicTrackId}
                                />
                            } />
                            <Route path="/profile" element={user ? <ProfilePage user={user} setUser={setUser} /> : <GuestAccessPage title="Biodata Locked" />} />
                            <Route path="/logs" element={user ? <LogPage user={user} /> : <GuestAccessPage title="Log Locked" />} />
                            <Route path="/write" element={user ? <WritingPage user={user} /> : <GuestAccessPage title="Write Locked" />} />
                            <Route path="/analytics" element={user ? <AnalyticsPage user={user} /> : <GuestAccessPage title="Analysis Locked" />} />
                            <Route path="/control-room" element={user?.role === 'ADMIN' ? <AdminPanelPage user={user} /> : <NotFoundPage />} />
                            <Route path="/admin" element={<NotFoundPage />} />

                            <Route path="/read/:id" element={<ReadPage user={user} />} />
                            <Route path="/profile/:userId" element={<OtherProfilePage user={user} />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}

function readThemePreference(): ThemeMode {
    const stored = localStorage.getItem('gebxby:theme');
    return stored === 'light' ? 'light' : 'dark';
}

function GuestAccessPage({ title }: { title: string }) {
    const navigate = useNavigate();

    return (
        <div className="border border-[#2a2a2a] bg-[#121212] px-6 py-16 text-center">
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Guest Read Mode</p>
            <h1 className="mb-3 font-mono text-3xl font-black uppercase tracking-normal text-white">{title}</h1>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-6 text-[#888]">
                Kamu tetap bisa membaca database dan memantau kategori sebagai guest. Login diperlukan hanya untuk menulis, vote, komentar, notifikasi, biodata, dan panel admin.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="border border-[#333] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white"
                >
                    Database
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                >
                    Login
                </button>
            </div>
        </div>
    );
}

function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="border border-[#2a2a2a] bg-[#121212] px-6 py-20 text-center">
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">404: NOT_FOUND</p>
            <h1 className="mb-3 font-mono text-3xl font-black uppercase tracking-normal text-white">Route Sealed</h1>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-6 text-[#888]">
                Panel admin tidak tersedia dari alamat publik seperti /admin. Akses kontrol hanya muncul untuk akun dengan role admin setelah login.
            </p>
            <button
                type="button"
                onClick={() => navigate('/')}
                className="border border-[#333] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white"
            >
                Return Database
            </button>
        </div>
    );
}
