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
        <div className="w-full">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-12 border-l-4 border-[#e60000] pl-6">
                <div>
                    <h1 className="text-white text-4xl font-mono font-black uppercase tracking-[0.2em]">Database Logs</h1>
                    <p className="text-[#666] text-xs font-mono uppercase tracking-widest mt-1">
                        Authorized Access Only // Terminal_ID: {Math.random().toString(36).substring(7).toUpperCase()}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] text-[#444] font-black uppercase tracking-widest">Filter_Protocol</span>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="bg-[#111] border border-[#333] text-[#e60000] text-[10px] font-bold p-2 px-4 uppercase outline-none focus:border-[#e60000] cursor-pointer transition-colors"
                    >
                        <option value="newest">Recent_Entries</option>
                        <option value="oldest">Archived_Files</option>
                    </select>
                </div>
            </div>

            {/* List View Section - Tidak pakai Grid lagi, tapi Flex Column */}
            {articles.length === 0 ? (
                <div className="text-center py-40 border border-dashed border-[#222] text-[#333] font-mono tracking-[0.5em] uppercase">
                    [ No_Data_Found_In_Sector ]
                </div>
            ) : (
                <div className="flex flex-col">
                    {articles.map((art) => (
                        <ContentCard key={art.idContent} art={art} user={user} />
                    ))}
                </div>
            )}
        </div>
    );
}