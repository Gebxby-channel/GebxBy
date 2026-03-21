import { useNavigate } from 'react-router-dom';

interface ContentCardProps {
    art: any;
    user: any;
}

export default function ContentCard({ art, user }: ContentCardProps) {
    const navigate = useNavigate();

    // Fungsi pembantu format tanggal
    const formatDate = (dateString: string) => {
        if (!dateString) return "UNKNOWN DATE";
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
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
            className="bg-[#181818] border border-[#2a2a2a] p-6 rounded-sm cursor-pointer hover:border-[#e60000] group transition-all duration-300 transform hover:-translate-y-1 relative shadow-inner shadow-black/30 h-full flex flex-col"
            onClick={() => navigate(`/read/${art.idContent}`)}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-[#e60000] scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>

            {/* Metadata Atas (Penambahan Tanggal di sini) */}
            <div className="flex justify-between items-center mb-1">
                <p className="text-[#888] text-[9px] font-mono tracking-wider">
                    ENTRY ID: <span className="text-white font-bold">{art.idContent?.substring(0, 8) || "N/A"}</span>
                </p>
                <p className="text-[#444] text-[9px] font-mono font-bold uppercase">
                    {formatDate(art.createdAt)}
                </p>
            </div>

            {/* Kategori Badge */}
            <div className="mb-3">
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-sm border border-[#e60000]/30 text-[#e60000] bg-[#e60000]/5 uppercase tracking-tighter">
                    {art.kategori || "GENERAL"}
                </span>
            </div>

            {/* Author Section */}
            <div className="mb-4">
                <p className="text-[#888] text-[9px] font-mono tracking-wider uppercase">
                    Author:
                    <span
                        onClick={handleAuthorClick}
                        className="text-white font-bold ml-1 hover:text-[#e60000] hover:underline transition-all cursor-pointer"
                    >
                        {art.user?.name ? art.user.name.toUpperCase() : "ANONYMOUS"}
                    </span>
                </p>
            </div>

            <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-tight group-hover:text-[#e60000] transition-colors font-mono line-clamp-2">
                {art.head}
            </h2>

            <p className="text-[#bbb] text-sm leading-relaxed mb-6 font-sans line-clamp-3 flex-grow">
                {art.paragrafs ? art.paragrafs.replace(/<[^>]*>/g, '').substring(0, 150) : "No File Content Preview Available."}...
            </p>

            <div className="flex justify-end pt-3 border-t border-[#2a2a2a]">
                <span className="text-xs text-[#e60000] font-bold group-hover:underline uppercase tracking-wider">
                    Read Full File →
                </span>
            </div>
        </div>
    );
}