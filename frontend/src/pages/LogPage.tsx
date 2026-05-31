import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, FileText, Inbox, Radio, ShieldAlert, UserRound, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import type { ActivityLogItem, CurrentUser } from '../types/forum';

type Tab = 'basis' | 'reports';

export default function LogPage({ user }: { user: CurrentUser }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const canReviewReports = user.role === 'ADMIN' || Boolean(user.badges?.some((badge) => badge.code === 'MODERATOR'));
    const [activeTab, setActiveTab] = useState<Tab>('basis');
    const [basis, setBasis] = useState<ActivityLogItem[]>([]);
    const [reports, setReports] = useState<ActivityLogItem[]>([]);
    const [selected, setSelected] = useState<ActivityLogItem | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const [basisResponse, reportResponse] = await Promise.all([
                api.get<ActivityLogItem[]>('/api/logs', { params: { limit: 80 } }),
                canReviewReports
                    ? api.get<ActivityLogItem[]>('/api/logs/reports', { params: { limit: 80 } })
                    : Promise.resolve({ data: [] as ActivityLogItem[] }),
            ]);
            setBasis(Array.isArray(basisResponse.data) ? basisResponse.data : []);
            setReports(Array.isArray(reportResponse.data) ? reportResponse.data : []);
        } finally {
            setLoading(false);
        }
    }, [canReviewReports]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        const openId = searchParams.get('open');
        if (!openId) return;
        api.get<ActivityLogItem>(`/api/logs/${openId}`)
            .then((response) => setSelected(response.data))
            .catch(() => setSearchParams({}));
    }, [searchParams, setSearchParams]);

    const items = activeTab === 'reports' ? reports : basis;
    const stats = useMemo(() => ({
        incoming: basis.filter((item) => item.direction === 'INCOMING').length,
        outgoing: basis.filter((item) => item.direction === 'OUTGOING').length,
        reports: reports.length,
    }), [basis, reports]);

    const openDestination = (item: ActivityLogItem) => {
        if (item.contentId) {
            navigate(`/read/${item.contentId}`);
            return;
        }
        if (item.targetUserId) {
            navigate(`/profile/${item.targetUserId}`);
        }
    };

    return (
        <div className="w-full">
            <div className="mb-10 border-l-4 border-[#e60000] pl-6">
                <div className="mb-2 flex items-center gap-2 text-[#e60000]">
                    <Radio size={18} />
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.35em]">Signal Ledger</span>
                </div>
                <h1 className="font-mono text-3xl font-black uppercase tracking-widest text-white">Activity Log</h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-tight text-[#666]">Basis records // notification detail // report queue</p>
            </div>

            <div className="mb-6 grid gap-3 md:grid-cols-3">
                <Metric label="Incoming" value={stats.incoming} />
                <Metric label="Outgoing" value={stats.outgoing} />
                <Metric label="Reports" value={stats.reports} danger={stats.reports > 0} />
            </div>

            <div className="mb-6 flex flex-wrap gap-2 border-b border-[#2a2a2a] pb-4">
                <TabButton active={activeTab === 'basis'} onClick={() => setActiveTab('basis')} icon={<Inbox size={14} />} label="Basis" />
                {canReviewReports && (
                    <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ShieldAlert size={14} />} label="Report Queue" />
                )}
            </div>

            <div className="min-h-[420px] border border-[#2a2a2a] bg-[#111]">
                {loading ? (
                    <div className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ Reading Ledger ]</div>
                ) : items.length === 0 ? (
                    <div className="py-24 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Records ]</div>
                ) : (
                    items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => activeTab === 'reports' ? openDestination(item) : setSelected(item)}
                            className="group relative flex w-full gap-4 border-b border-[#202020] px-5 py-4 text-left transition-all hover:bg-[#171717]"
                        >
                            <LogIcon item={item} />
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#e60000]">{item.type}</span>
                                    <span className="font-mono text-[9px] uppercase text-[#555]">{item.direction}</span>
                                    {item.reportQueue && <span className="border border-[#e60000]/50 px-2 py-0.5 font-mono text-[8px] font-black uppercase text-[#e60000]">Queue</span>}
                                </div>
                                <h2 className="m-0 truncate font-mono text-sm font-black uppercase text-white group-hover:text-[#e60000]">{item.title}</h2>
                                <p className="m-0 mt-1 line-clamp-2 font-sans text-sm leading-6 text-[#999]">{item.message || item.reason}</p>
                                <div className="mt-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase text-[#555]">
                                    <span>{formatDate(item.createdAt)}</span>
                                    <span>{item.actorName || 'System'}</span>
                                    {item.contentTitle && <span className="truncate">File: {item.contentTitle}</span>}
                                    {item.targetUserName && <span>Target: {item.targetUserName}</span>}
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 h-3 w-3 border-r border-t border-[#e60000]/0 transition-colors group-hover:border-[#e60000]" />
                        </button>
                    ))
                )}
            </div>

            {selected && (
                <LogDetailModal
                    item={selected}
                    onClose={() => {
                        setSelected(null);
                        setSearchParams({});
                    }}
                    onOpenDestination={openDestination}
                />
            )}
        </div>
    );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
    return (
        <div className="border border-[#2a2a2a] bg-[#151515] p-4">
            <p className="m-0 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[#555]">{label}</p>
            <p className={`m-0 mt-2 font-mono text-3xl font-black ${danger ? 'text-[#e60000]' : 'text-white'}`}>{value}</p>
        </div>
    );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-9 items-center gap-2 border px-4 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                active ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#333] text-[#777] hover:border-white hover:text-white'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

function LogIcon({ item }: { item: ActivityLogItem }) {
    const Icon = item.reportQueue ? AlertTriangle : item.targetType === 'USER' ? UserRound : FileText;
    return (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[#333] bg-[#0b0b0b] text-[#e60000] shadow-[0_0_18px_rgba(230,0,0,0.08)]">
            <Icon size={17} />
        </div>
    );
}

function LogDetailModal({ item, onClose, onOpenDestination }: { item: ActivityLogItem; onClose: () => void; onOpenDestination: (item: ActivityLogItem) => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl border border-[#2a2a2a] bg-[#0d0d0d] p-6 shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-[#333] text-[#777] hover:border-[#e60000] hover:text-white"
                    title="Close"
                >
                    <X size={15} />
                </button>
                <div className="mb-5 border-l-4 border-[#e60000] pl-4 pr-10">
                    <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">{item.type}</p>
                    <h2 className="m-0 mt-2 font-mono text-2xl font-black uppercase tracking-normal text-white">{item.title}</h2>
                    <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#555]">{formatDate(item.createdAt)}</p>
                </div>
                <div className="mb-5 border border-[#202020] bg-[#111] p-4">
                    <p className="m-0 whitespace-pre-wrap font-sans text-sm leading-7 text-[#ccc]">{item.message || item.reason || 'No detail.'}</p>
                </div>
                <div className="grid gap-3 font-mono text-[10px] uppercase text-[#777] md:grid-cols-2">
                    <Meta label="Actor" value={item.actorName || 'System'} />
                    <Meta label="Target" value={item.targetUserName || item.contentTitle || item.targetType} />
                    <Meta label="Direction" value={item.direction} />
                    <Meta label="Queue" value={item.reportQueue ? 'REPORT_QUEUE' : 'BASIS'} />
                </div>
                {(item.contentId || item.targetUserId) && (
                    <div className="mt-6 flex justify-end">
                        <button
                            type="button"
                            onClick={() => onOpenDestination(item)}
                            className="border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                        >
                            Open Target
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-[#202020] bg-[#101010] p-3">
            <p className="m-0 text-[#444]">{label}</p>
            <p className="m-0 mt-1 truncate text-white">{value}</p>
        </div>
    );
}

function formatDate(dateString?: string) {
    if (!dateString) return 'NO_DATE';
    return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
