import { useEffect, useState } from 'react';
import axios from 'axios';
import ContentCard from '../components/ContentCard';

const CATEGORIES = [
    "General",
    "Fan-Novel",
    "Spekulasi & Teori",
    "Analistic Pshycologic",
    "Lore",
    "QNA"
];

export default function CategoryPage({ user }: { user: any }) {
    const [allArticles, setAllArticles] = useState<any[]>([]);
    const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("General");
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        setLoading(true);
        axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/content/all-content', { withCredentials: true })
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setAllArticles(data);

                // Filter awal berdasarkan kategori default (General)
                const filtered = data.filter((art: any) =>
                    (art.kategori || "General").toLowerCase() === "general"
                );
                setFilteredArticles(filtered);
                setLoading(false);
            })
            .catch(err => {
                console.error("Gagal ambil data kategori:", err);
                setLoading(false);
            });
    }, []);

    // Logika ketika user mengganti kategori
    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        const filtered = allArticles.filter((art: any) => {
            // Kita buat case-insensitive supaya aman
            const artCat = art.kategori || "General";
            return artCat.toLowerCase() === category.toLowerCase();
        });
        setFilteredArticles(filtered);
    };

    return (
        <div className="w-full">
            {/* Header Kategori */}
            <div className="mb-12 border-l-4 border-[#e60000] pl-6">
                <h1 className="text-white text-3xl font-mono font-black uppercase tracking-widest">Category Archive</h1>
                <p className="text-[#666] text-xs font-mono uppercase tracking-tight mt-1">Sorting Data by Sector // Filter Active</p>

                {/* Selector Kategori ala Tactical Menu */}
                <div className="mt-8 flex flex-wrap gap-3">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryChange(cat)}
                            className={`px-4 py-2 font-mono text-[10px] font-black uppercase transition-all border ${
                                selectedCategory === cat
                                    ? 'bg-[#e60000] border-[#e60000] text-white shadow-[0_0_15px_rgba(230,0,0,0.4)]'
                                    : 'bg-[#111] border-[#333] text-[#444] hover:border-[#e60000]/50 hover:text-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Artikel yang Terfilter */}
            <div className="flex flex-col min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-t-[#e60000] border-[#222] rounded-full animate-spin"></div>
                        <span className="text-[10px] text-[#444] font-mono animate-pulse">SCANNING_DATABASE...</span>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-[#222] text-[#444] font-mono tracking-widest">
                        [ NO_FILES_FOUND_IN_{selectedCategory.toUpperCase().replace(/\s/g, '_')} ]
                    </div>
                ) : (
                    filteredArticles.map((art) => (
                        <ContentCard key={art.idContent} art={art} user={user} />
                    ))
                )}
            </div>
        </div>
    );
}