import { useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import ContentCard from '../components/ContentCard';
import GlobalSearch from '../components/GlobalSearch';
import type { AnnouncementItem, ContentItem, CurrentUser, FeedPayload, GenreItem } from '../types/forum';
import { useFeedback } from '../components/feedback';
import { profilePathForUser } from '../utils/profilePath';
import { setRuntimeCategoryColors } from '../utils/categoryColors';
import { LazyRenderList } from '../components/LazyRender';

type FeedMode = 'all' | 'recommended' | 'trending' | 'category' | 'following';

export default function HomePage({ user }: { user: CurrentUser | null }) {
    const navigate = useNavigate();
    const feedback = useFeedback();
    const [feedMode, setFeedMode] = useState<FeedMode>('all');
    const [selectedCategory, setSelectedCategory] = useState('General');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
    const terminalId = useMemo(() => user ? user.userID.replaceAll('-', '').substring(0, 6).toUpperCase() : 'GUEST', [user]);
    const feedQuery = useInfiniteQuery({
        queryKey: ['feed-page', user?.userID ?? 'guest', feedMode, feedMode === 'category' ? selectedCategory : 'all'],
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<FeedPayload>('/content/feed-page', {
                signal,
                params: {
                    mode: feedMode,
                    category: feedMode === 'category' ? selectedCategory : undefined,
                    page: pageParam,
                    limit: 12,
                },
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        placeholderData: (previous) => previous,
        staleTime: 30_000,
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
        <div className="w-full">
            <div className="mb-8">
                <GlobalSearch wide />
            </div>

            <section className="mb-8 border border-[#2a2a2a] bg-[#111]/70 p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Feed</p>
                        <h2 className="m-0 mt-1 font-mono text-xl font-black uppercase tracking-normal text-white">Archive Routing</h2>
                    </div>
                    <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-[#555]">Adaptive archive routing</p>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <FeedButton active={feedMode === 'all'} label="All" onClick={() => selectFeedMode('all')} />
                        <FeedButton active={feedMode === 'recommended'} label="Recommended" onClick={() => selectFeedMode('recommended')} />
                        <FeedButton active={feedMode === 'trending'} label="Trending" onClick={() => selectFeedMode('trending')} />
                        <FeedButton active={feedMode === 'following'} label="Following" onClick={() => selectFeedMode('following')} />
                        <FeedButton active={feedMode === 'category'} label="Category" onClick={() => selectFeedMode('category')} />
                    </div>
                    {feedMode === 'category' && (
                        <select
                            id="feed-category-filter"
                            name="feedCategory"
                            aria-label="Filter feed by category"
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                            className="h-10 border border-[#333] bg-[#0d0d0d] px-3 font-mono text-[10px] font-black uppercase text-[#e60000] outline-none focus:border-[#e60000]"
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    )}
                </div>
            </section>

            <div className="mb-12 flex min-h-[220px] flex-col gap-6 border-l-4 border-[#e60000] pl-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center border border-[#e60000] bg-[#170707] text-[#e60000]">
                            <Megaphone size={18} />
                        </span>
                        <div>
                            <h1 className="font-mono text-4xl font-black uppercase tracking-normal text-white">Announcement</h1>
                            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#666]">
                                {user ? 'Authorized Access' : 'Guest Read Access'} // Terminal_ID: {terminalId}
                            </p>
                        </div>
                    </div>

                    {announcement ? (
                        <div className="max-w-3xl">
                            <p className="m-0 text-sm leading-relaxed text-[#aaa] md:text-base">
                                <span className="font-mono font-black uppercase text-[#e60000]">Announcement:</span>{' '}
                                {announcement.message}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    const path = profilePathForUser(announcement.adminUserId, user?.userID);
                                    if (path) navigate(path);
                                }}
                                className="mt-4 flex items-center gap-3 text-left transition-all hover:text-[#e60000]"
                            >
                                <span className="h-9 w-9 overflow-hidden border border-[#333] bg-[#181818] transition-all hover:border-[#e60000]">
                                    {announcement.adminPhoto ? (
                                        <img
                                            src={announcement.adminPhoto}
                                            alt=""
                                            width={36}
                                            height={36}
                                            className="h-full w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : null}
                                </span>
                                <p className="m-0 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">
                                    ~ from {announcement.adminName || 'Admin'}
                                </p>
                            </button>
                        </div>
                    ) : (
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#888]">
                            Announcement channel aktif. Belum ada event khusus dari admin.
                        </p>
                    )}
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#444]">Filter_Protocol</span>
                    <select
                        id="feed-sort-order"
                        name="feedSortOrder"
                        aria-label="Sort feed entries"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest' | 'popular')}
                        className="cursor-pointer border border-[#333] bg-[#111] p-2 px-4 font-mono text-[10px] font-bold uppercase text-[#e60000] outline-none transition-colors focus:border-[#e60000]"
                    >
                        <option value="newest">Recent_Entries</option>
                        <option value="oldest">Archived_Files</option>
                        <option value="popular">Most_UP</option>
                    </select>
                </div>
            </div>

            {feedQuery.isLoading ? (
                <FeedSkeleton />
            ) : sortedArticles.length === 0 ? (
                <div className="min-h-[360px] border border-dashed border-[#222] py-40 text-center font-mono uppercase tracking-[0.4em] text-[#333]">
                    [ No_Data_Found_In_Sector ]
                </div>
            ) : (
                <div className="flex min-h-[640px] flex-col">
                    <LazyRenderList
                        items={sortedArticles}
                        getKey={(art) => art.idContent}
                        estimateSize={260}
                        className="flex flex-col"
                        renderItem={(art) => <ContentCard art={art} user={user} />}
                    />
                    {feedQuery.hasNextPage && (
                        <button
                            type="button"
                            onClick={() => void feedQuery.fetchNextPage()}
                            disabled={feedQuery.isFetchingNextPage}
                            className="mt-8 self-center border border-[#333] px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-[#777] transition-all hover:border-[#e60000] hover:text-[#e60000] disabled:cursor-wait disabled:opacity-50"
                        >
                            {feedQuery.isFetchingNextPage ? 'Loading...' : 'Load More'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
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
                    ? 'border-[#e60000] bg-[#e60000] text-white'
                    : 'border-[#333] bg-[#0d0d0d] text-[#777] hover:border-[#e60000] hover:text-white'
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
