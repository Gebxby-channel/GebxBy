import { useEffect, useState } from 'react';
import axios from 'axios';
import ContentCard from '../components/ContentCard'; // Pastikan path ini benar

// Di sini kita tambahkan { user } di parameter fungsi agar App.tsx nggak merah lagi
export default function HomePage({ user }: { user: any }) {
    const [articles, setArticles] = useState<any[]>([]);

    useEffect(() => {
        // Ambil semua konten dari database
        axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/content/all-content', { withCredentials: true })
            .then(res => {
                setArticles(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => console.error("Gagal ambil artikel:", err));
    }, []);

    return (
        <div className="min-h-screen bg-[#0f0f0f] p-6 md:p-12 selection:bg-red-900/30">
            <div className="max-w-7xl mx-auto">
                {/* Header Visual Database */}
                <div className="mb-10 border-l-4 border-[#e60000] pl-4 animate-in fade-in slide-in-from-left duration-700">
                    <h1 className="text-white text-3xl font-mono font-black uppercase tracking-widest">
                        Database_Logs
                    </h1>
                    <p className="text-[#666] text-xs font-mono uppercase tracking-tight">
                        Authorized Access Only // Scan Complete
                    </p>
                </div>

                {/* Grid Menampilkan SEMUA Artikel menggunakan ContentCard */}
                {articles.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-[#2a2a2a] text-[#444] font-mono">
                        [ NO ACCESSIBLE DATA FOUND IN CLUSTER ]
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {articles.map((art) => (
                            <ContentCard
                                key={art.idContent}
                                art={art}
                                user={user} // Oper data user login ke tiap card
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}