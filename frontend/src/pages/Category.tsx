import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api, { cachedGet, isRequestCanceled } from '../lib/api';
import ContentCard from '../components/ContentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEFAULT_CATEGORIES, getCategoryColor, setRuntimeCategoryColors } from '../utils/categoryColors';
import type { CurrentUser, FeedPayload, GenreItem } from '../types/forum';
import { LazyRenderList } from '../components/LazyRender';

export default function CategoryPage({ user }: { user: CurrentUser | null }) {
    const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const feedQuery = useInfiniteQuery({
        queryKey: ['category-feed-page', user?.userID ?? 'guest', selectedCategory],
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<FeedPayload>('/content/feed-page', {
                signal,
                params: {
                    mode: selectedCategory === 'All' ? 'all' : 'category',
                    category: selectedCategory === 'All' ? undefined : selectedCategory,
                    page: pageParam,
                    limit: 12,
                },
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        placeholderData: (previous) => previous,
        staleTime: 45_000,
    });
    const articles = useMemo(() => mergePages(feedQuery.data?.pages ?? []), [feedQuery.data?.pages]);

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

    const selectCategory = (category: string) => {
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
                {feedQuery.isLoading ? (
                    <LoadingSpinner label="Scanning Database" />
                ) : articles.length === 0 ? (
                    <div className="border border-dashed border-[#222] py-20 text-center font-mono tracking-widest text-[#444]">
                        [ NO_FILES_FOUND_IN_{selectedCategory.toUpperCase().replace(/\s/g, '_')} ]
                    </div>
                ) : (
                    <>
                        <LazyRenderList
                            items={articles}
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
                    </>
                )}
            </div>
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
