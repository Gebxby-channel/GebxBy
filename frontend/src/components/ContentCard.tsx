import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowBigDown, ArrowBigUp, Bookmark, BookmarkCheck, Eye, MessageSquare, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { getCategoryColor } from '../utils/categoryColors';
import { getCategoryLabel, isThreadCategory } from '../utils/categoryColors';
import { profilePathForUser } from '../utils/profilePath';
import { stripHtml } from '../utils/sanitize';
import { formatIndonesiaDate } from '../utils/time';
import type { ContentItem, CurrentUser } from '../types/forum';
import type { ContentStats } from '../types/forum';
import BadgeStrip from './BadgeStrip';
import ShareDialog from './ShareDialog';
import api, { invalidateApiCache } from '../lib/api';
import { useFeedback } from './feedback';

interface ContentCardProps {
    art: ContentItem;
    user: CurrentUser | null;
}

export default function ContentCard({ art, user }: ContentCardProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const feedback = useFeedback();
    const themeColor = getCategoryColor(art.kategori);
    const [shareOpen, setShareOpen] = useState(false);
    const [stats, setStats] = useState<ContentStats>({
        idContent: art.idContent,
        viewCount: art.viewCount,
        upCount: art.upCount,
        downCount: art.downCount,
        commentCount: art.commentCount,
        userVote: art.userVote,
    });
    const [bookmarked, setBookmarked] = useState(Boolean(user?.bookmarkedContentIds?.includes(art.idContent)));
    const [actionBusy, setActionBusy] = useState(false);

    useEffect(() => {
        setStats({
            idContent: art.idContent,
            viewCount: art.viewCount,
            upCount: art.upCount,
            downCount: art.downCount,
            commentCount: art.commentCount,
            userVote: art.userVote,
        });
    }, [art.idContent, art.viewCount, art.upCount, art.downCount, art.commentCount, art.userVote]);

    useEffect(() => {
        setBookmarked(Boolean(user?.bookmarkedContentIds?.includes(art.idContent)));
    }, [art.idContent, user?.bookmarkedContentIds]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'NO DATA';
        return formatIndonesiaDate(dateString);
    };

    const handleAuthorClick = (event: MouseEvent) => {
        event.stopPropagation();
        const path = profilePathForUser(art.user?.userID, user?.userID);
        if (path) {
            navigate(path);
        }
    };

    const preview = stripHtml(art.paragrafs) || 'No encrypted data preview available for this terminal entry...';
    const coverVisual = art.coverImage ?? art.images?.[0];
    const coverImage = coverVisual?.thumbnail || coverVisual?.data;
    const shareUrl = buildArticleShareUrl(art.idContent);
    const shareMediaUrl = coverImage?.startsWith('http') ? coverImage : undefined;

    const handleVote = async (vote: 'UP' | 'DOWN') => {
        if (!user) {
            feedback.toast('Login dulu untuk memberi vote.', 'info');
            return;
        }
        setActionBusy(true);
        try {
            const response = await api.post<ContentStats>(`/content/${art.idContent}/vote`, { vote });
            setStats(response.data);
            void queryClient.invalidateQueries({ queryKey: ['saved-posts', user.userID] });
            void queryClient.invalidateQueries({ queryKey: ['home-analytics'] });
        } catch {
            feedback.toast('Vote gagal disimpan. Coba lagi.', 'error');
        } finally {
            setActionBusy(false);
        }
    };

    const handleBookmark = async () => {
        if (!user) {
            feedback.toast('Login dulu untuk menyimpan bookmark.', 'info');
            return;
        }
        setActionBusy(true);
        try {
            if (bookmarked) {
                await api.delete(`/api/user/bookmarks/${art.idContent}`);
                setBookmarked(false);
            } else {
                await api.post(`/api/user/bookmarks/${art.idContent}`);
                setBookmarked(true);
            }
            invalidateApiCache('/api/user/bookmarks');
            void queryClient.invalidateQueries({ queryKey: ['saved-posts', user.userID, 'bookmarks'] });
        } catch {
            feedback.toast('Bookmark gagal diperbarui. Coba lagi.', 'error');
        } finally {
            setActionBusy(false);
        }
    };

    return (
        <article
            className="archive-card group flex min-h-[240px] cursor-pointer flex-col gap-6 border-b border-[#222] px-4 py-8 pl-7 transition-all duration-300 hover:bg-[#111]/70 md:flex-row"
            style={{ '--genre-color': themeColor } as CSSProperties}
            onClick={() => navigate(`/read/${art.idContent}`)}
        >
            <span className="archive-card__genre-line" aria-hidden="true" />
            <div className="flex flex-[2] flex-col">
                <div className="mb-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleAuthorClick}
                        className="flex h-6 w-6 items-center justify-center overflow-hidden border border-[#333] transition-all hover:border-[#ff1744]"
                        style={{ backgroundColor: `${themeColor}33` }}
                        title={`Open ${art.user?.name || 'author'} profile`}
                    >
                        {art.user?.picture ? (
                            <img src={art.user.picture} alt="" width={24} height={24} loading="lazy" decoding="async" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className="font-mono text-[10px] font-black text-white">U</span>
                        )}
                    </button>
                    <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] tracking-tight">
                        <button
                            type="button"
                            onClick={handleAuthorClick}
                            className="truncate bg-transparent p-0 text-left font-bold uppercase text-white transition-colors hover:underline"
                            style={{ maxWidth: 180 }}
                        >
                            {art.user?.name || 'Penulis anonim'}
                            {art.user?.username && <span className="ml-2 text-[#666]">@{art.user.username}</span>}
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
                            {getCategoryLabel(art.kategori)}
                        </span>
                    </div>
                </div>
                <div className="mb-3">
                    <BadgeStrip badges={art.user?.badges} compact />
                </div>

                {!isThreadCategory(art.kategori) && <h2
                    className="mb-2 line-clamp-2 font-mono text-xl font-black uppercase leading-tight tracking-normal text-white transition-colors md:text-2xl"
                    style={{ color: 'white' }}
                >
                    {art.head || 'Tanpa judul'}
                </h2>}

                <p className={`mb-6 max-w-2xl font-sans leading-relaxed text-[#999] ${isThreadCategory(art.kategori) ? 'line-clamp-4 text-base' : 'line-clamp-2 text-sm'}`}>
                    {preview}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-[#777]">
                        <div className="mr-1 flex h-10 items-center gap-2 font-mono text-[10px] font-bold text-[#555]">
                            <span className="h-1.5 w-1.5" style={{ backgroundColor: themeColor }} />
                            {formatDate(art.createdAt)}
                        </div>
                        <ActionButton label="Dibaca" value={stats.viewCount} icon={<Eye size={18} />} onClick={() => navigate(`/read/${art.idContent}`)} />
                        <ActionButton label="Upvote" value={stats.upCount} active={stats.userVote === 'UP'} disabled={actionBusy} icon={<ArrowBigUp size={19} />} onClick={() => void handleVote('UP')} />
                        <ActionButton label="Downvote" value={stats.downCount} active={stats.userVote === 'DOWN'} disabled={actionBusy} icon={<ArrowBigDown size={19} />} onClick={() => void handleVote('DOWN')} />
                        <ActionButton label="Komentar" value={stats.commentCount} icon={<MessageSquare size={18} />} onClick={() => navigate(`/read/${art.idContent}#comments`)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={(event) => { event.stopPropagation(); void handleBookmark(); }} disabled={actionBusy} className={`flex h-10 items-center gap-2 border px-3 font-mono text-[10px] font-black uppercase transition-colors disabled:opacity-50 ${bookmarked ? 'border-[#ff1744] text-[#ff1744]' : 'border-[#333] text-[#777] hover:border-[#ff1744] hover:text-white'}`} aria-label={bookmarked ? 'Hapus bookmark' : 'Tambahkan bookmark'} title={bookmarked ? 'Tersimpan' : 'Bookmark'}>
                            {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                setShareOpen(true);
                            }}
                            className="flex h-10 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] transition-all hover:border-[#ff1744] hover:text-white"
                            title="Share"
                        >
                            <Share2 size={16} />
                            Share
                        </button>
                    </div>
                </div>
            </div>

            {coverImage && (
            <div className="hidden max-w-[180px] flex-1 md:block">
                <div className="relative aspect-square w-full overflow-hidden border border-[#222] bg-[#050505] transition-all duration-300 group-hover:border-[#444]">
                    <img
                        src={coverImage}
                        alt=""
                        width={coverVisual?.width ?? 180}
                        height={coverVisual?.height ?? 180}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-85 grayscale transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/45" />
                    <div className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2" style={{ borderColor: `${themeColor}70` }} />
                    <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2" style={{ borderColor: `${themeColor}70` }} />
                </div>
            </div>
            )}
            <ShareDialog
                open={shareOpen}
                title={art.head || 'CodexAvernico Archive'}
                text={preview.slice(0, 180)}
                url={shareUrl}
                mediaUrl={shareMediaUrl}
                onClose={() => setShareOpen(false)}
            />
        </article>
    );
}

function buildArticleShareUrl(contentId: string) {
    if (typeof window === 'undefined') {
        return `/read/${contentId}`;
    }
    return `${window.location.origin}/read/${contentId}`;
}

function ActionButton({ icon, value, label, active = false, disabled = false, onClick }: { icon: ReactNode; value: number; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} disabled={disabled} className={`flex h-10 min-w-[68px] items-center justify-center gap-2 border px-2.5 font-mono text-xs font-bold transition-colors disabled:opacity-50 ${active ? 'border-[#ff1744] bg-[#ff1744]/10 text-[#ff1744]' : 'border-[#292929] text-[#777] hover:border-[#555] hover:text-white'}`} title={label} aria-label={`${label}: ${value}`}>
            {icon}
            <span>{value ?? 0}</span>
        </button>
    );
}
