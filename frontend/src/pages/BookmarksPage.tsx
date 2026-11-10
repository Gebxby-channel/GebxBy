import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowBigDown, ArrowBigUp, Bookmark } from 'lucide-react';
import api from '../lib/api';
import ContentCard from '../components/ContentCard';
import type { ContentItem, CurrentUser } from '../types/forum';

type SavedTab = 'bookmarks' | 'upvoted' | 'downvoted';

export default function BookmarksPage({ user }: { user: CurrentUser }) {
    const [tab, setTab] = useState<SavedTab>('bookmarks');
    const bookmarks = useQuery({
        queryKey: ['saved-posts', user.userID, 'bookmarks'],
        queryFn: async ({ signal }) => (await api.get<ContentItem[]>('/api/user/bookmarks', { signal })).data,
        staleTime: 60_000,
    });
    const upvoted = useQuery({
        queryKey: ['saved-posts', user.userID, 'upvoted'],
        queryFn: async ({ signal }) => (await api.get<ContentItem[]>('/content/voted', { signal, params: { direction: 'UP' } })).data,
        staleTime: 60_000,
        enabled: tab === 'upvoted',
    });
    const downvoted = useQuery({
        queryKey: ['saved-posts', user.userID, 'downvoted'],
        queryFn: async ({ signal }) => (await api.get<ContentItem[]>('/content/voted', { signal, params: { direction: 'DOWN' } })).data,
        staleTime: 60_000,
        enabled: tab === 'downvoted',
    });

    const activeQuery = tab === 'bookmarks' ? bookmarks : tab === 'upvoted' ? upvoted : downvoted;
    const entries = activeQuery.data ?? [];

    return (
        <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-[#242424] bg-black">
            <header className="sticky top-0 z-10 border-b border-[#242424] bg-black/95 px-5 pt-4 backdrop-blur">
                <h1 className="mb-4 text-xl font-extrabold text-white">Tulisan tersimpan</h1>
                <div className="grid grid-cols-3">
                    <SavedTabButton active={tab === 'bookmarks'} icon={<Bookmark size={17} />} label="Bookmark" onClick={() => setTab('bookmarks')} />
                    <SavedTabButton active={tab === 'upvoted'} icon={<ArrowBigUp size={18} />} label="Disukai" onClick={() => setTab('upvoted')} />
                    <SavedTabButton active={tab === 'downvoted'} icon={<ArrowBigDown size={18} />} label="Tidak disukai" onClick={() => setTab('downvoted')} />
                </div>
            </header>

            {activeQuery.isLoading ? (
                <div className="grid gap-4 p-5" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-[#151515]" />)}</div>
            ) : activeQuery.isError ? (
                <div className="p-10 text-center text-sm text-[#999]">Tulisan gagal dimuat. Coba buka menu ini lagi.</div>
            ) : entries.length === 0 ? (
                <div className="px-6 py-20 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#151515] text-[#777]"><Bookmark size={20} /></div><h2 className="text-base font-bold text-white">Belum ada tulisan di sini</h2><p className="mt-2 text-sm text-[#777]">Tulisan yang kamu {tab === 'bookmarks' ? 'bookmark' : tab === 'upvoted' ? 'beri upvote' : 'beri downvote'} akan muncul di halaman ini.</p></div>
            ) : (
                <div className="divide-y divide-[#222]">
                    {entries.map((item) => <ContentCard key={item.idContent} art={item} user={user} />)}
                </div>
            )}
        </div>
    );
}

function SavedTabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
    return <button type="button" onClick={onClick} className={`relative flex min-h-12 items-center justify-center gap-2 px-2 text-xs font-bold transition-colors ${active ? 'text-white' : 'text-[#777] hover:bg-white/5 hover:text-white'}`}>{icon}<span>{label}</span>{active && <span className="absolute inset-x-5 bottom-0 h-1 rounded-full bg-[#ff1744]" />}</button>;
}
