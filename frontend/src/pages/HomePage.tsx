import { useEffect, useState } from 'react';
import axios from 'axios';
import ContentCard from '../components/ContentCard';

export default function HomePage({ user }: { user: any }) {
    const [articles, setArticles] = useState<any[]>([]);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); // State Sortir

    useEffect(() => {
        axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/content/all-content', { withCredentials: true })
            .then(res => {
                let data = Array.isArray(res.data) ? res.data : [];

                // LOGIKA SORTIR: Membandingkan waktu createdAt
                data.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
                });

                setArticles(data);
            })
            .catch(err => console.error("Gagal ambil artikel:", err));
    }, [sortOrder]);

    return (
        <div className="min-h-screen bg-[#0f0f0f] p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-10 border-l-4 border-[#e60000] pl-4">
                    <div>
                        <h1 className="text-white text-3xl font-mono font-black uppercase tracking-widest">Database Logs</h1>
                        <p className="text-[#666] text-xs font-mono uppercase tracking-tight">Authorized Access Only // Scan Complete</p>
                    </div>

                    {/* DROPDOWN SORTIR */}
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[8px] text-[#444] font-bold uppercase tracking-widest">Sort Protocol</span>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="bg-[#111] border border-[#333] text-[#e60000] text-[10px] font-bold p-2 px-4 uppercase outline-none focus:border-[#e60000] cursor-pointer"
                        >
                            <option value="newest">Newest Entry</option>
                            <option value="oldest">Oldest Entry</option>
                        </select>
                    </div>
                </div>

                {articles.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-[#2a2a2a] text-[#444] font-mono">[ NO DATA FOUND ]</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {articles.map((art) => (
                            <ContentCard key={art.idContent} art={art} user={user} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}