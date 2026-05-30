import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart2, Database, Folder, LogOut, PenTool, User } from 'lucide-react';
import { logout, oauthLoginUrl } from '../lib/api';
import type { CurrentUser } from '../types/forum';
import NotificationBell from './NotificationBell';

interface NavbarProps {
    user: CurrentUser | null;
}

const menuItems = [
    { label: 'Database', path: '/', icon: Database },
    { label: 'Write', path: '/write', icon: PenTool },
    { label: 'Biodata', path: '/profile', icon: User },
    { label: 'Analisis', path: '/analytics', icon: BarChart2 },
    { label: 'Kategori', path: '/category', icon: Folder },
];

export default function Navbar({ user }: NavbarProps) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            navigate('/login', { replace: true });
            window.location.reload();
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
                        <button
                            type="button"
                            onClick={() => { window.location.href = oauthLoginUrl(); }}
                            className="border-2 border-[#e60000] bg-transparent px-6 py-2 font-mono text-xs font-bold uppercase tracking-widest text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                        >
                            Initiate Access
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
