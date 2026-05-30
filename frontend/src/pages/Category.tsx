import { useEffect, useState } from 'react';
import api from '../lib/api';
import ContentCard from '../components/ContentCard';
import { DEFAULT_CATEGORIES, getCategoryColor } from '../utils/categoryColors';
import type { ContentItem, CurrentUser } from '../types/forum';

export default function CategoryPage({ user }: { user: CurrentUser }) {
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [articles, setArticles] = useState<ContentItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<string[]>('/content/categories')
            .then(res => {
                const merged = Array.from(new Set(['All', ...DEFAULT_CATEGORIES, ...res.data]));
                setCategories(merged);
            })
            .catch(() => setCategories(['All', ...DEFAULT_CATEGORIES]));
    }, []);

    useEffect(() => {
        api.get<ContentItem[]>('/content/all-content', {
            params: selectedCategory === 'All' ? undefined : { category: selectedCategory },
        })
            .then(res => setArticles(Array.isArray(res.data) ? res.data : []))
            .catch(() => setArticles([]))
            .finally(() => setLoading(false));
    }, [selectedCategory]);

    const selectCategory = (category: string) => {
        setLoading(true);
        setSelectedCategory(category);
    };

    return (
        <div className="w-full">
            <div className="mb-12 border-l-4 border-[#e60000] pl-6">
                <h1 className="font-mono text-3xl font-black uppercase tracking-widest text-white">Category Archive</h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-tight text-[#666]">Sorting Data by Sector // Filter Active</p>

                <div className="mt-8 flex flex-wrap gap-3">
                    {categories.map((category) => {
                        const active = selectedCategory === category;
                        const color = category === 'All' ? '#e60000' : getCategoryColor(category);
                        return (
                            <button
                                key={category}
                                type="button"
                                onClick={() => selectCategory(category)}
                                className="border px-4 py-2 font-mono text-[10px] font-black uppercase transition-all"
                                style={{
                                    borderColor: active ? color : '#333',
                                    color: active ? '#fff' : '#666',
                                    backgroundColor: active ? color : '#111',
                                    boxShadow: active ? `0 0 16px ${color}55` : 'none',
                                }}
                            >
                                {category}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex min-h-[400px] flex-col">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                        <div className="h-8 w-8 animate-spin border-2 border-[#222] border-t-[#e60000]" />
                        <span className="font-mono text-[10px] text-[#444]">SCANNING_DATABASE...</span>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="border border-dashed border-[#222] py-20 text-center font-mono tracking-widest text-[#444]">
                        [ NO_FILES_FOUND_IN_{selectedCategory.toUpperCase().replace(/\s/g, '_')} ]
                    </div>
                ) : (
                    articles.map((art) => (
                        <ContentCard key={art.idContent} art={art} user={user} />
                    ))
                )}
            </div>
        </div>
    );
}
