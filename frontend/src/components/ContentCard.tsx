import { useNavigate } from 'react-router-dom';
import { Bookmark, MoreHorizontal, MessageSquare } from 'lucide-react';
import { getCategoryColor } from '../utils/categoryColors';

interface ContentCardProps {
    art: any;
    user: any;
}

export default function ContentCard({ art, user }: ContentCardProps) {
    const navigate = useNavigate();
    const themeColor = getCategoryColor(art.kategori);

    const formatDate = (dateString: string) => {
        if (!dateString) return "JAN 01, 2026";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short', day: '2-digit'
        }).toUpperCase();
    };

    const handleAuthorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (art.user?.userID === user?.userID) {
            navigate('/profile');
        } else if (art.user?.userID) {
            navigate(`/profile/${art.user.userID}`);
        }
    };

    return (
        <div
            className="group flex flex-col md:flex-row gap-6 py-8 border-b border-[#222] cursor-pointer hover:bg-[#111]/50 transition-all duration-300 px-4"
            style={{ borderLeft: `3px solid ${themeColor}` }}
            onClick={() => navigate(`/read/${art.idContent}`)}
        >
            {/* Left Section */}
            <div className="flex-[2] flex flex-col">
                {/* Author Info */}
                <div className="flex items-center gap-2 mb-3">
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden border border-[#333]"
                        style={{ backgroundColor: themeColor + '33' }}
                    >
                        {art.user?.picture ? (
                            <img src={art.user.picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[10px] text-white font-black">U</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-tight">
                        <span
                            onClick={handleAuthorClick}
                            className="text-white font-bold hover:underline uppercase transition-colors cursor-pointer"
                            onMouseEnter={e => (e.currentTarget.style.color = themeColor)}
                            onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                        >
                            {art.user?.name || "ANONYMOUS_OFFICER"}
                        </span>
                        <span className="text-[#444]">IN</span>
                        <span
                            className="font-bold uppercase px-1.5 py-0.5 border text-[9px]"
                            style={{
                                color: themeColor,
                                borderColor: themeColor,
                                backgroundColor: themeColor + '15',
                            }}
                        >
                            {art.kategori || "UNASSIGNED"}
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h2
                    className="text-xl md:text-2xl font-black text-white mb-2 leading-tight uppercase tracking-tighter transition-colors font-mono line-clamp-2"
                    onMouseEnter={e => (e.currentTarget.style.color = themeColor)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'white')}
                >
                    {art.head || "NO_SUBJECT_FOUND"}
                </h2>

                <p className="text-[#888] text-sm font-sans leading-relaxed line-clamp-2 mb-6 max-w-2xl">
                    {art.paragrafs
                        ? art.paragrafs.replace(/<[^>]*>/g, '')
                        : "No encrypted data preview available for this terminal entry..."}
                </p>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[#444]">
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                            <span style={{ color: themeColor }}>●</span> {formatDate(art.createdAt)}
                        </div>
                        <div className="flex items-center gap-1 hover:text-white transition-colors">
                            <MessageSquare size={14} />
                            <span className="text-[10px] font-bold font-mono">12</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[#444]">
                        <Bookmark
                            size={16}
                            className="transition-colors cursor-pointer"
                            onMouseEnter={e => (e.currentTarget.style.color = themeColor)}
                            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
                        />
                        <MoreHorizontal size={16} className="hover:text-white transition-colors" />
                    </div>
                </div>
            </div>

            {/* Right Section: Thumbnail */}
            <div className="flex-1 hidden md:block max-w-[200px]">
                <div
                    className="relative aspect-square w-full bg-[#111] overflow-hidden transition-all duration-300 border"
                    style={{ borderColor: '#222' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = themeColor + '80')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}
                >
                    <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)',
                            backgroundSize: '10px 10px'
                        }}
                    />
                    <div className="w-full h-full flex items-center justify-center bg-[#050505]">
                        <span className="text-[8px] font-black text-[#222] tracking-[0.3em] rotate-90">DATA_VISUAL</span>
                    </div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: themeColor + '60' }} />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: themeColor + '60' }} />
                </div>
            </div>
        </div>
    );
}