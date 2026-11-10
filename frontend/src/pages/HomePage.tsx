import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, Flame, Megaphone, TrendingUp } from 'lucide-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ContentCard from '../components/ContentCard';
import GlobalSearch from '../components/GlobalSearch';
import type { AnalyticsPayload, AnnouncementItem, ContentItem, CurrentUser, FeedPayload, GenreItem } from '../types/forum';
import { useFeedback } from '../components/feedback';
import { profilePathForUser } from '../utils/profilePath';
import { getCategoryLabel, isThreadCategory, setRuntimeCategoryColors } from '../utils/categoryColors';
import { LazyRenderList } from '../components/LazyRender';

type FeedMode = 'all' | 'recommended' | 'trending' | 'category' | 'following';

export default function HomePage({ user }: { user: CurrentUser | null }) {
    const navigate = useNavigate();
    const feedback = useFeedback();
    const [feedMode, setFeedMode] = useState<FeedMode>('all');
    const [selectedCategory, setSelectedCategory] = useState('General');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
    const feedQueryKey = useMemo(
        () => ['feed-page', user?.userID ?? 'guest', feedMode, feedMode === 'category' ? selectedCategory : 'all'],
        [feedMode, selectedCategory, user?.userID],
    );
    const feedQuery = useInfiniteQuery({
        queryKey: feedQueryKey,
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<FeedPayload>('/content/feed-page', {
                signal,
                params: {
                    mode: feedMode,
                    category: feedMode === 'category' ? selectedCategory : undefined,
                    page: pageParam,
                    limit: 5,
                },
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        placeholderData: (previous) => previous,
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnMount: true,
    });
    const articles = useMemo(() => mergePages(feedQuery.data?.pages ?? []), [feedQuery.data?.pages]);
    const sortedArticles = useMemo(() => sortArticles(articles, sortOrder), [articles, sortOrder]);

    const announcementQuery = useQuery({
        queryKey: ['announcement', 'latest'],
        queryFn: async ({ signal }) => {
            const response = await api.get<AnnouncementItem | ''>('/api/announcements/latest', { signal });
            return isAnnouncement(response.data) ? response.data : null;
        },
        staleTime: 60_000,
    });
    const analyticsQuery = useQuery({
        queryKey: ['home-analytics'],
        queryFn: async ({ signal }) => {
            const response = await api.get<AnalyticsPayload>('/content/analytics', { signal });
            return response.data;
        },
        staleTime: 5 * 60_000,
    });

    const categoryQuery = useQuery({
        queryKey: ['content-taxonomy'],
        queryFn: async ({ signal }) => {
            const [categoriesResponse, genreResponse] = await Promise.all([
                api.get<string[]>('/content/categories', { signal }),
                api.get<GenreItem[]>('/content/genre-definitions', { signal }),
            ]);
            return {
                categories: Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [],
                genres: Array.isArray(genreResponse.data) ? genreResponse.data : [],
            };
        },
        staleTime: 5 * 60_000,
    });
    const categories = useMemo(() => categoryQuery.data?.categories ?? [], [categoryQuery.data?.categories]);
    const announcement = announcementQuery.data ?? null;

    useEffect(() => {
        if (feedQuery.isError) {
            feedback.toast('Feed gagal dimuat. Coba sync ulang sebentar lagi.', 'error');
        }
    }, [feedQuery.isError, feedback]);

    useEffect(() => {
        if (categoryQuery.data?.genres) {
            setRuntimeCategoryColors(categoryQuery.data.genres);
        }
    }, [categoryQuery.data?.genres]);

    useEffect(() => {
        if (categories.length > 0 && !categories.includes(selectedCategory)) {
            setSelectedCategory(categories[0] ?? 'General');
        }
    }, [categories, selectedCategory]);

    const selectFeedMode = (nextMode: FeedMode) => {
        if (nextMode === 'following' && !user) {
            feedback.toast('Login dulu untuk membuka feed following.', 'info');
            return;
        }
        setFeedMode(nextMode);
    };

    return (
        <div className="mx-auto w-full max-w-[1080px]">
            <div className="mx-auto mb-5 max-w-[680px]"><GlobalSearch wide /></div>
            <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,680px)_minmax(280px,340px)]">
                <section className="min-w-0">
                    <div className="mb-5 border border-[#242424] bg-[#101010] p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div><p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#ff1744]">Feed</p><h1 className="m-0 mt-1 text-xl font-black text-white">Beranda</h1></div>
                            {feedQuery.isFetching && feedQuery.data && <span className="text-[10px] text-[#777]">Memperbarui…</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <FeedButton active={feedMode === 'all'} label="Semua" onClick={() => selectFeedMode('all')} />
                            <FeedButton active={feedMode === 'recommended'} label="Rekomendasi" onClick={() => selectFeedMode('recommended')} />
                            <FeedButton active={feedMode === 'trending'} label="Trending" onClick={() => selectFeedMode('trending')} />
                            <FeedButton active={feedMode === 'following'} label="Mengikuti" onClick={() => selectFeedMode('following')} />
                            <FeedButton active={feedMode === 'category'} label="Kategori" onClick={() => selectFeedMode('category')} />
                        </div>
                        {feedMode === 'category' && <select aria-label="Filter feed berdasarkan kategori" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="mt-3 h-10 w-full border border-[#333] bg-[#0d0d0d] px-3 text-sm text-white outline-none focus:border-[#ff1744]">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>}
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#242424] pt-3">
                            <span className="text-xs text-[#777]">Tulisan terbaru dari komunitas</span>
                            <select aria-label="Urutkan tulisan" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest' | 'popular')} className="rounded-full border border-[#333] bg-[#111] px-3 py-2 text-xs text-[#ff1744] outline-none"><option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="popular">Terpopuler</option></select>
                        </div>
                    </div>
                    {feedQuery.isLoading ? <FeedSkeleton /> : sortedArticles.length === 0 ? (
                        <div className="min-h-[320px] border border-dashed border-[#222] py-32 text-center text-sm text-[#666]">Belum ada tulisan untuk ditampilkan.</div>
                    ) : (
                        <div className="flex min-h-[500px] flex-col">
                            <LazyRenderList items={sortedArticles} getKey={(art) => art.idContent} estimateSize={260} className="flex flex-col" renderItem={(art) => <ContentCard art={art} user={user} />} />
                            {feedQuery.hasNextPage && <button type="button" onClick={() => void feedQuery.fetchNextPage()} disabled={feedQuery.isFetchingNextPage} className="mt-6 self-center rounded-full border border-[#333] px-6 py-3 text-sm font-bold text-[#aaa] hover:border-[#ff1744] hover:text-white disabled:opacity-50">{feedQuery.isFetchingNextPage ? 'Memuat…' : 'Muat tulisan lainnya'}</button>}
                        </div>
                    )}
                </section>
                <aside className="grid gap-4 lg:sticky lg:top-6">
                    <AnalyticsCard analytics={analyticsQuery.data} onOpen={() => navigate('/analytics')} />
                    <WhatsHappeningCard analytics={analyticsQuery.data} articles={sortedArticles} onOpen={(id) => navigate(`/read/${id}`)} />
                    <AnnouncementCard announcement={announcement} loading={announcementQuery.isLoading} user={user} onAdmin={() => { if (announcement) { const path = profilePathForUser(announcement.adminUserId, user?.userID); if (path) navigate(path); } }} />
                </aside>
            </div>
        </div>
    );
}

function AnalyticsCard({ analytics, onOpen }: { analytics?: AnalyticsPayload; onOpen: () => void }) {
    const leaders = analytics?.weeklyLeaderboard?.slice(0, 5) ?? [];
    const max = Math.max(1, ...leaders.map((entry) => entry.upCount));
    return <section className="rounded-2xl border border-[#242424] bg-[#101010] p-4"><div className="mb-4 flex items-center justify-between"><h2 className="m-0 flex items-center gap-2 text-base font-extrabold text-white"><BarChart3 size={17} className="text-[#ff1744]" />Analitik tulisan</h2><button type="button" onClick={onOpen} className="text-[#777] hover:text-white" aria-label="Buka halaman analitik"><ArrowUpRight size={17} /></button></div><p className="mb-4 text-xs text-[#777]">Penulis dengan vote terbanyak minggu ini</p>{leaders.length ? <div className="grid gap-3">{leaders.map((entry, index) => <div key={entry.user.userID} className="grid grid-cols-[22px_minmax(0,1fr)_28px] items-center gap-2"><span className="text-xs font-bold text-[#777]">{index + 1}</span><div className="min-w-0"><div className="mb-1 truncate text-xs font-bold text-[#ddd]">{entry.user.name}</div><div className="h-1.5 overflow-hidden rounded-full bg-[#292929]"><div className="h-full rounded-full bg-[#ff1744]" style={{ width: `${Math.max(5, entry.upCount / max * 100)}%` }} /></div></div><span className="text-right text-xs text-[#aaa]">{entry.upCount}</span></div>)}</div> : <p className="m-0 text-sm text-[#777]">Belum ada data trending minggu ini.</p>}<button type="button" onClick={onOpen} className="mt-4 w-full border-t border-[#242424] pt-3 text-left text-xs font-bold text-[#ff1744] hover:text-white">Lihat analitik lengkap</button></section>;
}

function WhatsHappeningCard({ analytics, articles, onOpen }: { analytics?: AnalyticsPayload; articles: ContentItem[]; onOpen: (id: string) => void }) {
    const items = (analytics?.mostUpvoted?.length ? analytics.mostUpvoted : articles).slice(0, 4);
    return <section className="rounded-2xl border border-[#242424] bg-[#101010] p-4"><h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-white"><Flame size={17} className="text-[#ff1744]" />What's going on</h2>{items.length ? <div className="grid">{items.map((item) => <button key={item.idContent} type="button" onClick={() => onOpen(item.idContent)} className="border-b border-[#222] py-3 text-left last:border-0"><span className="flex items-center gap-1 text-[10px] text-[#777]"><TrendingUp size={12} />{getCategoryLabel(item.kategori)} · {item.upCount} vote</span><span className="mt-1 line-clamp-2 block text-sm font-bold text-[#ddd] hover:text-white">{isThreadCategory(item.kategori) ? `Utas dari ${item.user?.name || 'Penulis'}` : item.head}</span><span className="mt-1 block truncate text-xs text-[#777]">{item.user?.name || 'Penulis'}</span></button>)}</div> : <p className="m-0 text-sm text-[#777]">Topik yang sedang ramai akan muncul di sini.</p>}</section>;
}

function AnnouncementCard({ announcement, loading, user, onAdmin }: { announcement: AnnouncementItem | null; loading: boolean; user: CurrentUser | null; onAdmin: () => void }) {
    return <section className="rounded-2xl border border-[#242424] bg-[#101010] p-4"><h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-white"><Megaphone size={17} className="text-[#ff1744]" />Pengumuman</h2>{loading ? <div className="h-12 animate-pulse rounded bg-[#1b1b1b]" /> : announcement ? <><p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-[#bbb]">{announcement.message}</p><button type="button" onClick={onAdmin} className="mt-3 flex items-center gap-2 text-xs text-[#777] hover:text-white">{announcement.adminPhoto && <img src={announcement.adminPhoto} alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" loading="lazy" />}Dari {announcement.adminName || 'Admin'}</button></> : <p className="m-0 text-sm text-[#777]">{user ? 'Belum ada pengumuman terbaru.' : 'Pengumuman terbaru dari admin.'}</p>}</section>;
}

function mergePages(pages: FeedPayload[]) {
    const known = new Set<string>();
    return pages.flatMap((page) => page.items).filter((item) => {
        if (known.has(item.idContent)) {
            return false;
        }
        known.add(item.idContent);
        return true;
    });
}

function FeedButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-9 border px-4 font-mono text-[9px] font-black uppercase tracking-widest transition-all ${
                active
                    ? 'border-[#ff1744] bg-[#ff1744] text-white'
                    : 'border-[#333] bg-[#0d0d0d] text-[#777] hover:border-[#ff1744] hover:text-white'
            }`}
        >
            {label}
        </button>
    );
}

function sortArticles(articles: ContentItem[], sortOrder: 'newest' | 'oldest' | 'popular') {
    return [...articles].sort((a, b) => {
        if (sortOrder === 'popular') {
            return b.upCount - a.upCount || b.viewCount - a.viewCount;
        }
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
}

function isAnnouncement(value: AnnouncementItem | '' | null | undefined): value is AnnouncementItem {
    return typeof value === 'object' && value !== null && typeof value.message === 'string';
}

function FeedSkeleton() {
    return (
        <div className="flex min-h-[640px] flex-col" aria-label="Loading feed entries" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-6 border-b border-[#222] px-4 py-8 md:flex-row">
                    <div className="flex flex-[2] flex-col">
                        <div className="mb-4 flex items-center gap-2">
                            <SkeletonBlock className="h-6 w-6" />
                            <SkeletonBlock className="h-4 w-40" />
                        </div>
                        <SkeletonBlock className="mb-3 h-7 w-3/4" />
                        <SkeletonBlock className="mb-2 h-4 w-full max-w-2xl" />
                        <SkeletonBlock className="mb-8 h-4 w-2/3 max-w-xl" />
                        <div className="mt-auto flex gap-4">
                            <SkeletonBlock className="h-3 w-20" />
                            <SkeletonBlock className="h-3 w-12" />
                            <SkeletonBlock className="h-3 w-12" />
                        </div>
                    </div>
                    <SkeletonBlock className="hidden aspect-square w-full max-w-[180px] flex-1 md:block" />
                </div>
            ))}
        </div>
    );
}

function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-[#1d1d1d] ${className}`} />;
}
