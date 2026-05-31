import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Menu, X } from 'lucide-react';
import type { CurrentUser } from '../types/forum';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import type { NavigationItem } from './navigationItems';

interface MobileSidebarProps {
    user: CurrentUser | null;
    menuItems: NavigationItem[];
    onTerminate: () => void | Promise<void>;
}

export default function MobileSidebar({ user, menuItems, onTerminate }: MobileSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(user?.name || 'Guest')}`;

    const handleTerminate = async () => {
        setDrawerOpen(false);
        await onTerminate();
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[#2a2a2a] bg-[#111]/95 shadow-md backdrop-blur md:hidden">
            <div className="grid min-h-[92px] grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-4">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[#333] bg-[#181818] text-[#e60000] transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white"
                        title="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                    <NavLink to="/" className="min-w-0 no-underline">
                        <div className="border-l-2 border-[#e60000] pl-3">
                            <h1 className="m-0 truncate font-mono text-xl font-extrabold uppercase tracking-wider text-white">
                                CodeXAvernico
                            </h1>
                            <p className="m-0 font-mono text-[10px] uppercase leading-tight tracking-widest text-[#888]">
                                Central Access
                            </p>
                        </div>
                    </NavLink>
                </div>

                <div className="col-start-3 flex flex-shrink-0 flex-col items-center gap-1">
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
                        onClick={() => void handleTerminate()}
                        className="flex h-7 items-center gap-1 border border-[#333] px-2 font-mono text-[8px] font-black uppercase tracking-widest text-[#e60000] transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white"
                        title={user ? 'Terminate session' : 'Open login'}
                    >
                        {user ? <LogOut size={11} /> : <LogIn size={11} />}
                        {user ? 'Logout' : 'Login'}
                    </button>
                </div>
            </div>

            {drawerOpen && (
                <div className="fixed inset-0 z-[100] bg-black/70" onMouseDown={() => setDrawerOpen(false)}>
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
