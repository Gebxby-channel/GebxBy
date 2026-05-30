import { Home, User, PenTool, BarChart2, Terminal, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ active }: { active: string }) {
    const navigate = useNavigate();

    const navItems = [
        { id: 'home', icon: Home, label: 'DATABASE', path: '/' },
        { id: 'write', icon: PenTool, label: 'WRITE', path: '/write' },
        { id: 'profile', icon: User, label: 'BIO-DATA', path: '/profile' },
        { id: 'analytics', icon: BarChart2, label: 'ANALYTICS', path: '/analytics' },
        { id: 'category', icon: Folder, label: 'CATEGORY', path: '/category' },
    ];

    return (
        <div className="fixed left-0 top-0 h-screen w-20 flex flex-col items-center py-6 border-r border-[#222] bg-[#0a0a0a] z-[60] shadow-[10px_0_30px_rgba(0,0,0,0.5)]">

            {/* Logo Section */}
            <div
                className="mb-12 cursor-pointer group relative"
                onClick={() => navigate('/')}
            >
                <div className="w-10 h-10 border-2 border-[#e60000] flex items-center justify-center rotate-45 group-hover:bg-[#e60000] transition-all duration-300">
                    <span className="text-white font-black -rotate-45 text-xl">X</span>
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#e60000]/30"></div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-6 flex-grow">
                {navItems.map((item) => (
                    <div
                        key={item.id}
                        className="relative flex flex-col items-center group cursor-pointer"
                        onClick={() => navigate(item.path)}
                    >
                        {active === item.id && (
                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-[#e60000] shadow-[4px_0_15px_rgba(230,0,0,0.8)]"></div>
                        )}

                        <div className={`p-3 transition-all duration-200 ${
                            active === item.id
                                ? 'bg-[#e60000] text-white'
                                : 'text-[#444] hover:text-[#e60000] hover:bg-[#111]'
                        }`}>
                            <item.icon size={20} strokeWidth={2.5} />
                        </div>
                        <span className={`text-[7px] font-black mt-1 tracking-tighter uppercase transition-colors ${
                            active === item.id ? 'text-white' : 'text-[#444]'
                        }`}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </nav>

            {/* Bottom Status Decor */}
            <div className="flex flex-col items-center gap-4 pb-4">
                <div className="flex flex-col gap-1">
                    <div className="w-1.5 h-1.5 bg-[#e60000] animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-[#222]"></div>
                </div>
                <Terminal size={14} className="text-[#222]" />
            </div>
        </div>
    );
}
