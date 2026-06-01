import { useEffect, useState } from 'react';
import { cachedGet, isRequestCanceled } from '../lib/api';
import ContentCard from '../components/ContentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEFAULT_CATEGORIES, getCategoryColor, setRuntimeCategoryColors } from '../utils/categoryColors';
import type { ContentItem, CurrentUser, GenreItem } from '../types/forum';

export default function CategoryPage({ user }: { user: CurrentUser | null }) {
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [articles, setArticles] = useState<ContentItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        Promise.allSettled([
            cachedGet<string[]>('/content/categories', { signal: controller.signal }, { ttlMs: 10 * 60_000 }),
            cachedGet<GenreItem[]>('/content/genre-definitions', { signal: controller.signal }, { ttlMs: 10 * 60_000 }),
        ])
            .then(([categoryResult, genreResult]) => {
                if (controller.signal.aborted) return;
                const data = categoryResult.status === 'fulfilled' && Array.isArray(categoryResult.value) ? categoryResult.value : [];
                if (genreResult.status === 'fulfilled' && Array.isArray(genreResult.value)) {
                    setRuntimeCategoryColors(genreResult.value);
                }
                setCategories(Array.from(new Set(['All', ...DEFAULT_CATEGORIES, ...data])));
            })
            .catch((error) => {
                if (!isRequestCanceled(error)) {
                    setCategories(['All', ...DEFAULT_CATEGORIES]);
                }
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        cachedGet<ContentItem[]>('/content/all-content', {
            signal: controller.signal,
            params: selectedCategory === 'All' ? undefined : { category: selectedCategory },
        }, {
            ttlMs: 45_000,
            scope: user?.userID ?? 'guest',
        })
            .then(data => setArticles(Array.isArray(data) ? data : []))
            .catch((error) => {
                if (!isRequestCanceled(error)) {
                    setArticles([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, [selectedCategory, user?.userID]);

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
                    <LoadingSpinner label="Scanning Database" />
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
