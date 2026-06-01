import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
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
        <header className="sticky top-0 z-50 hidden border-b border-[#2a2a2a] bg-[#111]/95 shadow-md backdrop-blur md:block">
            <div className="grid min-h-[88px] grid-cols-[240px_1fr_auto] items-center gap-5 px-6 lg:grid-cols-[270px_1fr_auto] xl:px-8">
                <NavLink to="/" className="min-w-0 no-underline">
                    <div className="border-l-2 border-[#e60000] pl-3">
                        <h1 className="m-0 truncate font-mono text-xl font-extrabold uppercase tracking-wider text-white lg:text-2xl">
                            CodeXAvernico
                        </h1>
                        <p className="m-0 font-mono text-[10px] uppercase leading-tight tracking-widest text-[#888]">
                            Central Access
                        </p>
                    </div>
                </NavLink>

                <nav className="flex min-w-0 max-w-[760px] items-center justify-center gap-2 justify-self-center">
                    {menuItems.map((item) => {
                        const active = location.pathname === item.path;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`flex h-10 min-w-[92px] items-center justify-center gap-2 border px-3 font-mono text-[8px] font-black uppercase tracking-[0.14em] transition-all lg:min-w-[104px] ${
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

                <div className="flex flex-shrink-0 items-center justify-end gap-3">
                    {user && <NotificationBell />}
                    <button
                        type="button"
                        onClick={() => navigate(user ? '/profile' : '/login')}
                        className="flex h-11 min-w-[108px] items-center justify-between gap-3 border border-[#333] bg-[#151515] px-2 text-left transition-all hover:border-[#e60000]"
                        title={user ? 'Open biodata' : 'Login'}
                    >
                        <span className="min-w-0 truncate font-mono text-[10px] font-black uppercase tracking-widest text-white">
                            {firstName}
                        </span>
                        <span className="h-8 w-8 flex-shrink-0 overflow-hidden border border-[#444] bg-[#181818]">
                            {user ? (
                                <img
                                    src={user.picture || defaultAvatar}
                                    alt="Profile"
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                                />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center font-mono text-xs font-black uppercase text-[#777]">G</span>
                            )}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => void onTerminate()}
                        className="flex h-11 min-w-[150px] items-center justify-center gap-2 border border-[#e60000]/70 px-5 font-mono text-[9px] font-black uppercase tracking-widest text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                        title={user ? 'Terminate session' : 'Open login'}
                    >
                        {user ? <LogOut size={13} /> : <LogIn size={13} />}
                        {user ? 'Terminate' : 'Login'}
                    </button>
                </div>
            </div>
        </header>
    );
}

function getFirstName(name?: string) {
    const clean = name?.trim();
    if (!clean) {
        return 'Guest';
    }
    return clean.split(/\s+/)[0];
}
