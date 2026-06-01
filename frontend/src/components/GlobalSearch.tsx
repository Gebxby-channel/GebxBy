import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BadgeCheck, FileText, Search, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cachedGet, isRequestCanceled } from '../lib/api';
import type { SearchPayload } from '../types/forum';
import LoadingSpinner from './LoadingSpinner';

type SearchTab = 'all' | 'users' | 'contents' | 'badges';

const tabs: { id: SearchTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'users', label: 'Users' },
    { id: 'contents', label: 'Writings' },
    { id: 'badges', label: 'Badges' },
];

export default function GlobalSearch({ wide = false }: { wide?: boolean }) {
    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('all');
    const [results, setResults] = useState<SearchPayload | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const trimmedQuery = useMemo(() => query.trim(), [query]);
    const hasResults = Boolean(
        results && (results.users.length > 0 || results.contents.length > 0 || results.badges.length > 0)
    );

    useEffect(() => {
        const closeWhenOutside = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', closeWhenOutside);
        return () => document.removeEventListener('mousedown', closeWhenOutside);
    }, []);

    useEffect(() => {
        if (trimmedQuery.length < 2) {
            setResults(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            cachedGet<SearchPayload>('/api/search', {
                signal: controller.signal,
                params: {
                    q: trimmedQuery,
                    type: activeTab,
                    size: 5,
                },
            }, {
                ttlMs: 30_000,
                scope: 'global-search',
            })
                .then((data) => {
                    setResults(data);
                    setOpen(true);
                })
                .catch((error) => {
                    if (!isRequestCanceled(error)) {
                        setResults(null);
                    }
                })
                .finally(() => {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                });
        }, 300);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [activeTab, trimmedQuery]);

    const reset = () => {
        setQuery('');
        setResults(null);
        setOpen(false);
    };

    const goTo = (path: string) => {
        reset();
        navigate(path);
    };

    return (
        <div ref={rootRef} className={`relative w-full min-w-[220px] ${wide ? '' : 'lg:w-[320px]'}`}>
            <div className="flex h-9 items-center border border-[#2a2a2a] bg-[#0d0d0d] px-3 text-[#777] focus-within:border-[#e60000]/70">
                <Search size={14} className="mr-2 flex-shrink-0 text-[#e60000]" />
                <input
                    id="global-search"
                    name="globalSearch"
                    aria-label="Search users, writings, and badges"
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    className="min-w-0 flex-1 bg-transparent font-mono text-[10px] font-black uppercase tracking-widest text-white outline-none placeholder:text-[#444]"
                    placeholder="Search users, writings, badges..."
                />
                {query && (
                    <button
                        type="button"
                        onClick={reset}
                        className="ml-2 text-[#555] hover:text-white"
                        title="Clear search"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {open && trimmedQuery.length >= 2 && (
                <div className="absolute left-0 right-0 top-11 z-[90] border border-[#2a2a2a] bg-[#0b0b0b] shadow-2xl shadow-black/70">
                    <div className="flex gap-1 border-b border-[#202020] p-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 border px-2 py-1.5 font-mono text-[8px] font-black uppercase tracking-widest ${
                                    activeTab === tab.id
                                        ? 'border-[#e60000] bg-[#e60000] text-white'
                                        : 'border-[#222] text-[#666] hover:border-[#555] hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="max-h-[520px] overflow-y-auto p-2">
                        {loading ? (
                            <LoadingSpinner compact label="Searching" />
                        ) : !hasResults ? (
                            <div className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Match ]</div>
                        ) : (
                            <div className="space-y-3">
                                {(activeTab === 'all' || activeTab === 'users') && results?.users.length ? (
                                    <SearchSection title="Users" icon={<UserRound size={13} />}>
                                        {results.users.map((item) => (
                                            <button
                                                key={item.userID}
                                                type="button"
                                                onClick={() => goTo(`/profile/${item.userID}`)}
                                                className="flex w-full items-center gap-3 border border-[#181818] bg-[#101010] p-3 text-left hover:border-[#e60000]/60"
                                            >
                                                <img
                                                    src={item.picture || `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(item.name)}`}
                                                    alt=""
                                                    width={36}
                                                    height={36}
                                                    className="h-9 w-9 border border-[#333] object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block truncate font-mono text-[11px] font-black uppercase text-white">{item.name}</span>
                                                    <span className="block truncate font-mono text-[9px] uppercase text-[#666]">{item.designation || 'NO DESIGNATION'}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </SearchSection>
                                ) : null}

                                {(activeTab === 'all' || activeTab === 'contents') && results?.contents.length ? (
                                    <SearchSection title="Writings" icon={<FileText size={13} />}>
                                        {results.contents.map((item) => (
                                            <article
                                                key={item.idContent}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => goTo(`/read/${item.idContent}`)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        goTo(`/read/${item.idContent}`);
                                                    }
                                                }}
                                                className="w-full border border-[#181818] bg-[#101010] p-3 text-left hover:border-[#e60000]/60"
                                            >
                                                <span className="mb-1 block truncate font-mono text-[11px] font-black uppercase text-white">{item.head}</span>
                                                <span className="block truncate font-mono text-[9px] uppercase text-[#666]">
                                                    {item.kategori} //{' '}
                                                    {item.user?.userID ? (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                goTo(`/profile/${item.user?.userID}`);
                                                            }}
                                                            className="font-mono uppercase text-[#777] hover:text-[#e60000]"
                                                        >
                                                            {item.user?.name || 'Unknown'}
                                                        </button>
                                                    ) : (
                                                        item.user?.name || 'Unknown'
                                                    )}
                                                    {' '}// UP {item.upCount}
                                                </span>
                                            </article>
                                        ))}
                                    </SearchSection>
                                ) : null}

                                {(activeTab === 'all' || activeTab === 'badges') && results?.badges.length ? (
                                    <SearchSection title="Badges" icon={<BadgeCheck size={13} />}>
                                        {results.badges.map((item) => (
                                            <div key={item.code} className="border border-[#181818] bg-[#101010] p-3">
                                                <div className="mb-1 flex items-center justify-between gap-3">
                                                    <span className="font-mono text-[11px] font-black uppercase text-white">{item.label}</span>
                                                    <span className="border border-[#e60000]/40 px-2 py-0.5 font-mono text-[8px] font-black uppercase text-[#e60000]">{item.code}</span>
                                                </div>
                                                <p className="m-0 line-clamp-2 font-sans text-xs leading-5 text-[#999]">{item.description}</p>
                                                {item.users.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {item.users.map((badgeUser) => (
                                                            <button
                                                                key={badgeUser.userID}
                                                                type="button"
                                                                onClick={() => goTo(`/profile/${badgeUser.userID}`)}
                                                                className="border border-[#333] px-2 py-1 font-mono text-[8px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-white"
                                                            >
                                                                {badgeUser.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </SearchSection>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SearchSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <section>
            <div className="mb-2 flex items-center gap-2 border-b border-[#1d1d1d] pb-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#e60000]">
                {icon}
                {title}
            </div>
            <div className="space-y-1.5">{children}</div>
        </section>
    );
}
