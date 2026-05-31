import { useNavigate } from 'react-router-dom';
import { ArrowBigDown, ArrowBigUp, Eye, MessageSquare } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { getCategoryColor } from '../utils/categoryColors';
import { stripHtml } from '../utils/sanitize';
import type { ContentItem, CurrentUser } from '../types/forum';
import BadgeStrip from './BadgeStrip';

interface ContentCardProps {
    art: ContentItem;
    user: CurrentUser | null;
}

export default function ContentCard({ art, user }: ContentCardProps) {
    const navigate = useNavigate();
    const themeColor = getCategoryColor(art.kategori);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'NO DATA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
        }).toUpperCase();
    };

    const handleAuthorClick = (event: MouseEvent) => {
        event.stopPropagation();
        if (art.user?.userID === user?.userID) {
            navigate('/profile');
        } else if (art.user?.userID) {
            navigate(`/profile/${art.user.userID}`);
        }
    };

    const preview = stripHtml(art.paragrafs) || 'No encrypted data preview available for this terminal entry...';
    const coverImage = art.coverImage?.thumbnail || art.coverImage?.data || art.images?.[0]?.thumbnail || art.images?.[0]?.data;

    return (
        <article
            className="archive-card group flex cursor-pointer flex-col gap-6 border-b border-[#222] px-4 py-8 transition-all duration-300 hover:bg-[#111]/70 md:flex-row"
            style={{ borderLeft: `3px solid ${themeColor}` }}
            onClick={() => navigate(`/read/${art.idContent}`)}
        >
            <div className="flex flex-[2] flex-col">
                <div className="mb-3 flex items-center gap-2">
                    <div
                        className="flex h-6 w-6 items-center justify-center overflow-hidden border border-[#333]"
                        style={{ backgroundColor: `${themeColor}33` }}
                    >
                        {art.user?.picture ? (
                            <img src={art.user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="font-mono text-[10px] font-black text-white">U</span>
                        )}
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] tracking-tight">
                        <button
                            type="button"
                            onClick={handleAuthorClick}
                            className="truncate bg-transparent p-0 text-left font-bold uppercase text-white transition-colors hover:underline"
                            style={{ maxWidth: 180 }}
                        >
                            {art.user?.name || 'ANONYMOUS_OFFICER'}
                        </button>
                        <span className="text-[#444]">IN</span>
                        <span
                            className="border px-1.5 py-0.5 text-[9px] font-bold uppercase"
                            style={{
                                color: themeColor,
                                borderColor: themeColor,
                                backgroundColor: `${themeColor}15`,
                            }}
                        >
                            {art.kategori || 'UNASSIGNED'}
                        </span>
                    </div>
                </div>
                <div className="mb-3">
                    <BadgeStrip badges={art.user?.badges} compact />
                </div>

                <h2
                    className="mb-2 line-clamp-2 font-mono text-xl font-black uppercase leading-tight tracking-normal text-white transition-colors md:text-2xl"
                    style={{ color: 'white' }}
                >
                    {art.head || 'NO_SUBJECT_FOUND'}
                </h2>

                <p className="mb-6 line-clamp-2 max-w-2xl font-sans text-sm leading-relaxed text-[#999]">
                    {preview}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-[#555]">
                        <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
                            <span className="h-1.5 w-1.5" style={{ backgroundColor: themeColor }} />
                            {formatDate(art.createdAt)}
                        </div>
                        <Stat icon={<Eye size={14} />} value={art.viewCount} label="READ" />
                        <Stat icon={<ArrowBigUp size={15} />} value={art.upCount} label="UP" />
                        <Stat icon={<ArrowBigDown size={15} />} value={art.downCount} label="DOWN" />
                        <Stat icon={<MessageSquare size={14} />} value={art.commentCount} label="COM" />
                    </div>
                </div>
            </div>

            <div className="hidden max-w-[180px] flex-1 md:block">
                <div className="relative aspect-square w-full overflow-hidden border border-[#222] bg-[#050505] transition-all duration-300 group-hover:border-[#444]">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover opacity-85 grayscale transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
                        />
                    ) : (
                        <>
                            <div
                                className="absolute inset-0 opacity-10"
                                style={{
                                    backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)',
                                    backgroundSize: '10px 10px',
                                }}
                            />
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="rotate-90 font-mono text-[8px] font-black tracking-[0.3em] text-[#252525]">DATA_VISUAL</span>
                            </div>
                        </>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/45" />
                    <div className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2" style={{ borderColor: `${themeColor}70` }} />
                    <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2" style={{ borderColor: `${themeColor}70` }} />
                </div>
            </div>
        </article>
    );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
    return (
        <div className="flex items-center gap-1 transition-colors hover:text-white" title={label}>
            {icon}
            <span className="font-mono text-[10px] font-bold">{value ?? 0}</span>
        </div>
    );
}
