import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BarChart2, Database, Folder, History, LogIn, LogOut, Menu, PenTool, ShieldCheck, User, X } from 'lucide-react';
import { logout } from '../lib/api';
import type { CurrentUser } from '../types/forum';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

interface NavbarProps {
    user: CurrentUser | null;
    onLogout: () => void;
}

const publicMenuItems = [
    { label: 'Database', path: '/', icon: Database },
    { label: 'Kategori', path: '/category', icon: Folder },
];

const memberMenuItems = [
    { label: 'Log', path: '/logs', icon: History },
    { label: 'Write', path: '/write', icon: PenTool },
    { label: 'Biodata', path: '/profile', icon: User },
    { label: 'Analisis', path: '/analytics', icon: BarChart2 },
];

export default function Navbar({ user, onLogout }: NavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const menuItems = [
        ...publicMenuItems,
        ...(user ? memberMenuItems : []),
        ...(user?.role === 'ADMIN' ? [{ label: 'Command', path: '/control-room', icon: ShieldCheck }] : []),
    ];
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(user?.name || 'Guest')}`;

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            setDrawerOpen(false);
            onLogout();
            navigate('/', { replace: true });
        }
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[#2a2a2a] bg-[#111]/95 shadow-md backdrop-blur">
            <div className="grid min-h-[92px] grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-3 md:min-h-[108px] md:items-center xl:min-h-[92px]">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[#333] bg-[#181818] text-[#e60000] transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white md:hidden"
                        title="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                    <NavLink to="/" className="min-w-0 no-underline">
                        <div className="border-l-2 border-[#e60000] pl-3">
                            <h1 className="m-0 truncate font-mono text-xl font-extrabold uppercase tracking-wider text-white md:text-2xl">
                                CodeXAvernico
                            </h1>
                            <p className="m-0 font-mono text-[10px] uppercase leading-tight tracking-widest text-[#888]">
                                Central Access
                            </p>
                        </div>
                    </NavLink>
                </div>

                <nav className="hidden min-w-0 max-w-[382px] flex-wrap items-center justify-center gap-1.5 justify-self-center border-y border-[#242424] bg-[#0d0d0d]/55 px-2 py-2 md:flex lg:max-w-[520px] xl:max-w-[780px]">
                    {menuItems.map((item) => {
                        const active = location.pathname === item.path;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`flex h-10 w-[88px] items-center justify-center gap-1.5 border px-2 font-mono text-[8px] font-black uppercase tracking-[0.12em] transition-all lg:w-[96px] xl:w-[104px] ${
                                    active
                                        ? 'border-[#e60000] bg-[#e60000] text-white'
                                        : 'border-[#2a2a2a] bg-[#141414]/80 text-[#777] hover:border-[#e60000]/70 hover:bg-[#181818] hover:text-white'
                                }`}
                            >
                                <item.icon size={14} strokeWidth={2.5} />
                                <span className="truncate">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="flex flex-shrink-0 items-start gap-2">
                    {user && (
                        <div className="hidden md:block">
                            <NotificationBell />
                        </div>
                    )}
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={() => navigate(user ? '/profile' : '/login')}
                            className="h-11 w-11 overflow-hidden border border-[#444] bg-[#181818] transition-all hover:border-[#e60000]"
                            title={user ? 'Open biodata' : 'Login'}
                        >
                            {user ? (
                                <img
                                    src={user.picture || defaultAvatar}
                                    alt="Profile"
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                                />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center font-mono text-xs font-black uppercase text-[#777]">G</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={user ? handleLogout : () => navigate('/login')}
                            className="flex h-7 items-center gap-1 border border-[#333] px-2 font-mono text-[8px] font-black uppercase tracking-widest text-[#e60000] transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white"
                            title={user ? 'Terminate session' : 'Open login'}
                        >
                            {user ? <LogOut size={11} /> : <LogIn size={11} />}
                            {user ? 'Logout' : 'Login'}
                        </button>
                    </div>
                </div>
            </div>

            {drawerOpen && (
                <div className="fixed inset-0 z-[100] bg-black/70 md:hidden" onMouseDown={() => setDrawerOpen(false)}>
                    <aside
                        className="h-screen w-[min(88vw,390px)] overflow-y-auto border-r border-[#2a2a2a] bg-[#0b0b0b] p-5 shadow-2xl"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="mb-8 flex items-start justify-between gap-4 border-b border-[#2a2a2a] pb-5">
                            <div className="border-l-2 border-[#e60000] pl-3">
                                <h2 className="m-0 font-mono text-xl font-black uppercase tracking-widest text-white">Menu</h2>
                                <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-[#666]">Navigation Drawer</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrawerOpen(false)}
                                className="flex h-9 w-9 items-center justify-center border border-[#333] text-[#777] hover:border-[#e60000] hover:text-white"
                                title="Close menu"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <GlobalSearch />
                        </div>

                        {user && (
                            <div className="mb-6 flex items-center justify-between gap-3 border border-[#222] bg-[#111] p-3">
                                <div className="min-w-0">
                                    <p className="m-0 truncate font-mono text-xs font-black uppercase text-white">{user.name || 'Officer'}</p>
                                    <p className="m-0 mt-1 truncate font-mono text-[9px] uppercase text-[#666]">{user.designation || 'No designation'}</p>
                                </div>
                                <NotificationBell />
                            </div>
                        )}

                        <nav className="grid gap-2">
                            {menuItems.map((item) => {
                                const active = location.pathname === item.path;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setDrawerOpen(false)}
                                        className={`flex h-12 items-center gap-3 border px-4 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                                            active
                                                ? 'border-[#e60000] bg-[#e60000] text-white'
                                                : 'border-[#242424] bg-[#101010] text-[#777] hover:border-[#e60000]/60 hover:text-white'
                                        }`}
                                    >
                                        <item.icon size={15} strokeWidth={2.5} />
                                        {item.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    </aside>
                </div>
            )}
        </header>
    );
}
