import './index.css';
import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
import api, { isRequestCanceled } from './lib/api';
import type { CurrentUser } from './types/forum';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WritingPage = lazy(() => import('./pages/WritingPage'));
const ReadPage = lazy(() => import('./pages/ReadPage'));
const OtherProfilePage = lazy(() => import('./pages/OtherProfilePage'));
const CategoryPage = lazy(() => import('./pages/Category'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const Login = lazy(() => import('./pages/Login'));
const AdminPanelPage = lazy(() => import('./pages/AdminPanelPage'));
const LogPage = lazy(() => import('./pages/LogPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import BackgroundMusic from './components/BackgroundMusic';
import Footer from './components/Footer';
import { FeedbackProvider } from './components/FeedbackProvider';
import { RealtimeProvider } from './components/RealtimeProvider';
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
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const widePage = location.pathname === '/' || location.pathname === '/bookmarks';

    useEffect(() => {
        if (user?.onboardingComplete === false) {
            navigate('/login?mode=onboarding', { replace: true });
        }
    }, [navigate, user?.onboardingComplete]);

    useEffect(() => {
        const refreshHomeFeed = () => {
            void queryClient.invalidateQueries({ queryKey: ['feed-page'] });
        };
        window.addEventListener('home-feed-refresh', refreshHomeFeed);
        return () => window.removeEventListener('home-feed-refresh', refreshHomeFeed);
    }, [queryClient]);

    return (
        <div className="terminal-grid flex min-h-screen flex-col md:flex-row">
            <Navbar user={user} onLogout={onLogout} />
            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <main className="w-full overflow-x-hidden">
                    <div className={`mx-auto w-full ${widePage ? 'max-w-[1440px] p-4 md:p-6' : 'max-w-6xl p-6 md:p-10'}`}>
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
    const [authLoading, setAuthLoading] = useState(true);
    const [theme, setTheme] = useState<ThemeMode>(() => readThemePreference());
    const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('gebxby:music-enabled') === 'true');
    const [musicTrackId, setMusicTrackId] = useState(() => localStorage.getItem('gebxby:music-track') ?? MUSIC_TRACKS[0]?.id ?? '');

    useEffect(() => {
        const controller = new AbortController();
        api.get<CurrentUser>('/api/user/me', { signal: controller.signal })
            .then(res => setUser(res.data))
            .catch((error) => {
                if (!isRequestCanceled(error)) {
                    setUser(null);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setAuthLoading(false);
                }
            });

        return () => controller.abort();
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

    return (
        <Router>
            <FeedbackProvider>
                <RealtimeProvider user={user}>
                    <PerformanceInsights />
                    <BackgroundMusic enabled={musicEnabled} trackId={musicTrackId} />
                    <Suspense fallback={<LoadingSpinner label="Decrypting Module" />}>
                        <Routes>
                            <Route path="/login" element={<Login user={user} setUser={setUser} />} />

                            <Route path="/*" element={
                                <MainLayout user={user} onLogout={becomeGuest}>
                                    <Routes>
                                        <Route path="/" element={authLoading ? <LoadingSpinner label="Memuat beranda" /> : <HomePage user={user} />} />
                                        <Route path="/category" element={authLoading ? <LoadingSpinner label="Memuat kategori" /> : <CategoryPage user={user} />} />
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
                                        <Route path="/profile" element={authLoading ? <LoadingSpinner label="Memeriksa akun" /> : user ? <ProfilePage user={user} setUser={setUser} /> : <GuestAccessPage title="Biodata Locked" />} />
                                        <Route path="/logs" element={authLoading ? <LoadingSpinner label="Memeriksa akun" /> : user ? <LogPage user={user} /> : <GuestAccessPage title="Log Locked" />} />
                                        <Route path="/write" element={authLoading ? <LoadingSpinner label="Memeriksa akun" /> : user ? <WritingPage user={user} /> : <GuestAccessPage title="Write Locked" />} />
                                        <Route path="/analytics" element={authLoading ? <LoadingSpinner label="Memeriksa akun" /> : user ? <AnalyticsPage user={user} /> : <GuestAccessPage title="Analysis Locked" />} />
                                        <Route path="/bookmarks" element={authLoading ? <LoadingSpinner label="Memeriksa akun" /> : user ? <BookmarksPage user={user} /> : <GuestAccessPage title="Bookmark Locked" />} />
                                        <Route path="/control-room" element={authLoading ? <LoadingSpinner label="Memeriksa akun" /> : user?.role === 'ADMIN' ? <AdminPanelPage user={user} /> : <NotFoundPage />} />
                                        <Route path="/admin" element={<NotFoundPage />} />

                                        <Route path="/read/:id" element={authLoading ? <LoadingSpinner label="Memuat tulisan" /> : <ReadPage user={user} />} />
                                        <Route path="/profile/:userId" element={authLoading ? <LoadingSpinner label="Memuat profil" /> : <OtherProfilePage user={user} />} />
                                        <Route path="*" element={<NotFoundPage />} />
                                    </Routes>
                                </MainLayout>
                            } />
                        </Routes>
                    </Suspense>
                </RealtimeProvider>
            </FeedbackProvider>
        </Router>
    );
}

function PerformanceInsights() {
    const location = useLocation();
    return <SpeedInsights route={location.pathname} />;
}

function readThemePreference(): ThemeMode {
    const stored = localStorage.getItem('gebxby:theme');
    return stored === 'light' ? 'light' : 'dark';
}

function GuestAccessPage({ title }: { title: string }) {
    const navigate = useNavigate();

    return (
        <div className="border border-[#2a2a2a] bg-[#121212] px-6 py-16 text-center">
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#ff1744]">Guest Read Mode</p>
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
                    className="border border-[#ff1744] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#ff1744] hover:bg-[#ff1744] hover:text-white"
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
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#ff1744]">Halaman tidak ditemukan</p>
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
