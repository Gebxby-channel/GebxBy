import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowBigUp, Eye, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cachedGet, isRequestCanceled } from '../lib/api';
import ContentCard from '../components/ContentCard';
import LoadingSpinner from '../components/LoadingSpinner';
import type { AnalyticsPayload, CurrentUser } from '../types/forum';
import { profilePathForUser } from '../utils/profilePath';
import { LazyRenderList } from '../components/LazyRender';

export default function AnalyticsPage({ user }: { user: CurrentUser }) {
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        cachedGet<AnalyticsPayload>('/content/analytics', { signal: controller.signal }, {
            ttlMs: 60_000,
            scope: user.userID,
        })
            .then(data => setAnalytics(data))
            .catch((error) => {
                if (!isRequestCanceled(error)) {
                    setAnalytics(null);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
        return () => controller.abort();
    }, [user.userID]);

    return (
        <div className="w-full">
            <div className="mb-12 border-l-4 border-[#e60000] pl-6">
                <h1 className="font-mono text-3xl font-black uppercase tracking-widest text-white">Analysis Terminal</h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-tight text-[#666]">Read Frequency // UP Signal // Weekly Leaderboard</p>
            </div>

            {loading || !analytics ? (
                <LoadingSpinner label="Aggregating Signals" />
            ) : (
                <div className="space-y-12">
                    <section>
                        <SectionTitle icon={<Trophy size={17} />} title="Weekly Leaderboard" />
                        <div className="grid gap-3">
                            {analytics.weeklyLeaderboard.length === 0 ? (
                                <Empty label="NO_WEEKLY_UP_SIGNAL" />
                            ) : (
                                <LazyRenderList
                                    items={analytics.weeklyLeaderboard}
                                    getKey={(entry) => entry.user.userID}
                                    estimateSize={76}
                                    className="grid gap-3"
                                    renderItem={(entry, index) => (
                                        <div className="flex items-center justify-between border border-[#2a2a2a] bg-[#151515] p-4">
                                            <div className="flex items-center gap-4">
                                                <span className="flex h-8 w-8 items-center justify-center bg-[#e60000] font-mono text-xs font-black text-white">{index + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const path = profilePathForUser(entry.user.userID, user.userID);
                                                        if (path) navigate(path);
                                                    }}
                                                    className="min-w-0 text-left"
                                                >
                                                    <p className="m-0 font-mono text-sm font-black uppercase text-white hover:text-[#e60000]">{entry.user.name}</p>
                                                    <p className="m-0 font-mono text-[10px] uppercase text-[#666]">{entry.user.designation || 'NO DESIGNATION'}</p>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 font-mono text-sm font-black text-[#e60000]">
                                                <ArrowBigUp size={18} />
                                                {entry.upCount}
                                            </div>
                                        </div>
                                    )}
                                />
                            )}
                        </div>
                    </section>

                    <section>
                        <SectionTitle icon={<Eye size={17} />} title="Most Read" />
                        {analytics.mostRead.length === 0 ? (
                            <Empty label="NO_READ_DATA" />
                        ) : (
                            <LazyRenderList
                                items={analytics.mostRead}
                                getKey={(item) => item.idContent}
                                estimateSize={260}
                                className="flex flex-col"
                                renderItem={(item) => <ContentCard art={item} user={user} />}
                            />
                        )}
                    </section>

                    <section>
                        <SectionTitle icon={<ArrowBigUp size={17} />} title="Most UP" />
                        {analytics.mostUpvoted.length === 0 ? (
                            <Empty label="NO_UP_DATA" />
                        ) : (
                            <LazyRenderList
                                items={analytics.mostUpvoted}
                                getKey={(item) => item.idContent}
                                estimateSize={260}
                                className="flex flex-col"
                                renderItem={(item) => <ContentCard art={item} user={user} />}
                            />
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
    return (
        <div className="mb-4 flex items-center gap-2 border-b border-[#2a2a2a] pb-3 font-mono text-sm font-black uppercase tracking-widest text-white">
            {icon}
            {title}
        </div>
    );
}

function Empty({ label }: { label: string }) {
    return (
        <div className="border border-dashed border-[#222] py-12 text-center font-mono text-xs uppercase tracking-widest text-[#444]">
            [ {label} ]
        </div>
    );
}
