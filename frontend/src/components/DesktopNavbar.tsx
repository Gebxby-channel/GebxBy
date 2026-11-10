import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LogIn, LogOut } from 'lucide-react';
import type { CurrentUser } from '../types/forum';
import NotificationBell from './NotificationBell';
import type { NavigationItem } from './navigationItems';

interface DesktopNavbarProps {
    user: CurrentUser | null;
    menuItems: NavigationItem[];
    onTerminate: () => void | Promise<void>;
}

export default function DesktopNavbar({ user, menuItems, onTerminate }: DesktopNavbarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(user?.name || 'Guest')}`;
    const firstName = getFirstName(user?.name);

    return (
        <aside className="sticky top-0 z-50 hidden h-screen w-[280px] shrink-0 flex-col border-r border-white/10 bg-black px-4 py-3 md:flex">
            <NavLink to="/" className="mb-5 flex min-h-14 items-center gap-3 rounded-xl px-3 text-white no-underline transition-colors hover:bg-white/10">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff1744] text-sm font-black text-white">C</span>
                <span className="min-w-0">
                    <span className="block truncate text-lg font-extrabold tracking-tight">CodeXAvernico</span>
                    <span className="block text-xs text-[#85858f]">Komunitas dan tulisan</span>
                </span>
            </NavLink>

            <nav aria-label="Menu utama" className="flex flex-col gap-1">
                {menuItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            aria-current={active ? 'page' : undefined}
                            className={`flex min-h-12 items-center gap-4 rounded-full px-4 text-[15px] transition-colors ${
                                active
                                    ? 'bg-white/10 font-bold text-white'
                                    : 'text-[#d6d6d9] hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <item.icon size={21} strokeWidth={active ? 2.5 : 2} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
                {user && <div className="my-2 border-t border-white/10" />}
                {user && (
                    <div className="flex items-center gap-4 rounded-full px-4 py-2 text-[15px] text-[#d6d6d9]">
                        <NotificationBell />
                        <span>Notifikasi</span>
                    </div>
                )}
            </nav>

            <button
                type="button"
                onClick={() => navigate(user ? '/write' : '/login')}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 font-bold text-black transition-colors hover:bg-zinc-200"
            >
                <span>{user ? 'Tulis' : 'Mulai'}</span>
                <ArrowRight size={17} />
            </button>

            <div className="mt-auto flex items-center gap-2 rounded-2xl p-2 hover:bg-white/10">
                <button
                    type="button"
                    onClick={() => navigate(user ? '/profile' : '/login')}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left"
                    title={user ? 'Buka profil' : 'Masuk'}
                >
                    <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[#181818]">
                        {user ? (
                            <img
                                src={user.picture || defaultAvatar}
                                alt=""
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                            />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">G</span>
                        )}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">{firstName}</span>
                        <span className="block truncate text-xs text-[#85858f]">{user?.username ? `@${user.username}` : 'Pengunjung'}</span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => void onTerminate()}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#a1a1aa] transition-colors hover:bg-white/10 hover:text-white"
                    title={user ? 'Keluar' : 'Masuk'}
                    aria-label={user ? 'Keluar' : 'Masuk'}
                >
                    {user ? <LogOut size={17} /> : <LogIn size={17} />}
                </button>
            </div>
        </aside>
    );
}

function getFirstName(name?: string) {
    const clean = name?.trim();
    if (!clean) {
        return 'Guest';
    }
    return clean.split(/\s+/)[0];
}
