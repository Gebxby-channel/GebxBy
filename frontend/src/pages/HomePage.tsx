import { useEffect, useMemo, useState } from 'react';
import { cachedGet } from '../lib/api';
import ContentCard from '../components/ContentCard';
import type { ContentItem, CurrentUser } from '../types/forum';

export default function HomePage({ user }: { user: CurrentUser | null }) {
    const [articles, setArticles] = useState<ContentItem[]>([]);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');
    const [loading, setLoading] = useState(true);
    const terminalId = useMemo(() => user ? user.userID.replaceAll('-', '').substring(0, 6).toUpperCase() : 'GUEST', [user]);
    const sortedArticles = useMemo(() => sortArticles(articles, sortOrder), [articles, sortOrder]);

    useEffect(() => {
        setLoading(true);
        cachedGet<ContentItem[]>('/content/all-content', undefined, {
            ttlMs: 45_000,
            scope: user?.userID ?? 'guest',
        })
            .then(data => setArticles(Array.isArray(data) ? data : []))
            .catch(() => setArticles([]))
            .finally(() => setLoading(false));
    }, [user?.userID]);

    return (
        <div className="w-full">
            <div className="mb-12 flex flex-col gap-6 border-l-4 border-[#e60000] pl-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="font-mono text-4xl font-black uppercase tracking-normal text-white">Database Logs</h1>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#666]">
                        {user ? 'Authorized Access' : 'Guest Read Access'} // Terminal_ID: {terminalId}
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#888]">
                        Registry aktif untuk semua entry yang sudah masuk ke database forum.
                    </p>
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
                <div className="border border-dashed border-[#222] py-32 text-center font-mono text-xs uppercase tracking-[0.4em] text-[#444]">
                    [ Syncing_Database ]
                </div>
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
