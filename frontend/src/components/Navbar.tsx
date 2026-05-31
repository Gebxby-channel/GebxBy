import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart2, Database, Folder, History, LogIn, LogOut, PenTool, ShieldCheck, User } from 'lucide-react';
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
    const menuItems = [
        ...publicMenuItems,
        ...(user ? memberMenuItems : []),
        ...(user?.role === 'ADMIN' ? [{ label: 'Command', path: '/control-room', icon: ShieldCheck }] : []),
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            onLogout();
            navigate('/', { replace: true });
        }
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[#2a2a2a] bg-[#111]/95 shadow-md backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <NavLink to="/" className="flex items-center gap-3 no-underline group">
                    <div className="border-l-2 border-[#e60000] pl-3">
                        <h1 className="m-0 font-mono text-xl font-extrabold uppercase tracking-wider text-white md:text-2xl">
                            CodeXAvernico
                        </h1>
                        <p className="m-0 font-mono text-[10px] uppercase leading-tight tracking-widest text-[#888]">
                            Central Access
                        </p>
                    </div>
                </NavLink>

                <nav className="flex min-w-0 flex-wrap items-center gap-2">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex h-9 items-center gap-2 border px-3 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isActive
                                        ? 'border-[#e60000] bg-[#e60000] text-white'
                                        : 'border-[#2a2a2a] bg-[#181818] text-[#777] hover:border-[#e60000]/60 hover:text-white'
                                }`
                            }
                        >
                            <item.icon size={14} strokeWidth={2.5} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <GlobalSearch />

                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <NotificationBell />
                            <button
                                type="button"
                                className="flex items-center gap-3 border border-[#2a2a2a] bg-[#181818] p-1.5 pr-4 transition-colors hover:border-[#e60000]/50"
                                onClick={() => navigate('/profile')}
                                title="Open biodata"
                            >
                                <img
                                    src={user.picture}
                                    alt="Profile"
                                    className="h-8 w-8 border border-[#444] object-cover"
                                    referrerPolicy="no-referrer"
                                />
                                <span className="m-0 max-w-[120px] truncate font-mono text-xs font-bold tracking-tight text-white">
                                    {user.name?.split(' ')[0] || 'Officer'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex h-9 items-center gap-2 border border-[#e60000]/40 px-3 font-mono text-[10px] font-bold uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                                title="Terminate session"
                            >
                                <LogOut size={14} />
                                Terminate
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="border border-[#2a2a2a] bg-[#181818] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">
                                Guest
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="flex h-9 items-center gap-2 border border-[#e60000] px-3 font-mono text-[10px] font-bold uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                                title="Open login"
                            >
                                <LogIn size={14} />
                                Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
