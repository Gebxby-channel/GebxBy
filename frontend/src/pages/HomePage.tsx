import { useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { cachedGet } from '../lib/api';
import ContentCard from '../components/ContentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import GlobalSearch from '../components/GlobalSearch';
import type { AnnouncementItem, ContentItem, CurrentUser } from '../types/forum';

type FeedMode = 'all' | 'recommended' | 'trending' | 'category';

export default function HomePage({ user }: { user: CurrentUser | null }) {
    const [articles, setArticles] = useState<ContentItem[]>([]);
    const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [feedMode, setFeedMode] = useState<FeedMode>('all');
    const [selectedCategory, setSelectedCategory] = useState('General');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
    const [loading, setLoading] = useState(true);
    const terminalId = useMemo(() => user ? user.userID.replaceAll('-', '').substring(0, 6).toUpperCase() : 'GUEST', [user]);
    const sortedArticles = useMemo(() => sortArticles(articles, sortOrder), [articles, sortOrder]);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([
            cachedGet<ContentItem[]>('/content/feed', {
                params: {
                    mode: feedMode,
                    category: feedMode === 'category' ? selectedCategory : undefined,
                    limit: 30,
                },
            }, {
                ttlMs: 45_000,
                scope: `${user?.userID ?? 'guest'}:${feedMode}:${selectedCategory}`,
            }),
            cachedGet<AnnouncementItem | ''>('/api/announcements/latest', undefined, {
                ttlMs: 60_000,
                scope: 'public',
            }),
            cachedGet<string[]>('/content/categories', undefined, {
                ttlMs: 5 * 60_000,
                scope: 'public',
            }),
        ])
            .then(([contentResult, announcementResult, categoriesResult]) => {
                setArticles(contentResult.status === 'fulfilled' && Array.isArray(contentResult.value) ? contentResult.value : []);
                setAnnouncement(announcementResult.status === 'fulfilled' && isAnnouncement(announcementResult.value) ? announcementResult.value : null);
                if (categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value)) {
                    setCategories(categoriesResult.value);
                    if (!categoriesResult.value.includes(selectedCategory)) {
                        setSelectedCategory(categoriesResult.value[0] ?? 'General');
                    }
                }
            })
            .finally(() => setLoading(false));
    }, [feedMode, selectedCategory, user?.userID]);

    return (
        <div className="w-full">
            <div className="mb-8">
                <GlobalSearch wide />
            </div>

            <section className="mb-8 border border-[#2a2a2a] bg-[#111]/70 p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Feed v2</p>
                        <h2 className="m-0 mt-1 font-mono text-xl font-black uppercase tracking-normal text-white">Recommendation Protocol</h2>
                    </div>
                    <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-[#555]">Adaptive archive routing</p>
                </div>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <FeedButton active={feedMode === 'all'} label="All" onClick={() => setFeedMode('all')} />
                        <FeedButton active={feedMode === 'recommended'} label="Recommended" onClick={() => setFeedMode('recommended')} />
                        <FeedButton active={feedMode === 'trending'} label="Trending" onClick={() => setFeedMode('trending')} />
                        <FeedButton active={feedMode === 'category'} label="Category" onClick={() => setFeedMode('category')} />
                    </div>
                    {feedMode === 'category' && (
                        <select
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

            <div className="mb-12 flex flex-col gap-6 border-l-4 border-[#e60000] pl-6 lg:flex-row lg:items-end lg:justify-between">
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
                            <div className="mt-4 flex items-center gap-3">
                                <div className="h-9 w-9 overflow-hidden border border-[#333] bg-[#181818]">
                                    {announcement.adminPhoto ? (
                                        <img
                                            src={announcement.adminPhoto}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : null}
                                </div>
                                <p className="m-0 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">
                                    ~ from {announcement.adminName || 'Admin'}
                                </p>
                            </div>
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

            {loading ? (
                <LoadingSpinner label="Syncing Database" />
            ) : sortedArticles.length === 0 ? (
                <div className="border border-dashed border-[#222] py-40 text-center font-mono uppercase tracking-[0.4em] text-[#333]">
                    [ No_Data_Found_In_Sector ]
                </div>
            ) : (
                <div className="flex flex-col">
                    {sortedArticles.map((art) => (
                        <ContentCard key={art.idContent} art={art} user={user} />
                    ))}
                </div>
            )}
        </div>
    );
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
