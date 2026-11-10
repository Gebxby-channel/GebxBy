import { useState } from 'react';
import { AtSign, Bell, CheckCheck, FileText, Heart, MessageSquare, ShieldAlert } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { NotificationItem } from '../types/forum';
import MentionText from '../components/MentionText';

type NotificationTab = 'all' | 'mentions';

export default function NotificationsPage() {
    const [tab, setTab] = useState<NotificationTab>('all');
    const [busyId, setBusyId] = useState<string | null>(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const notifications = useQuery({
        queryKey: ['notifications', tab],
        queryFn: async ({ signal }) => {
            const response = await api.get<NotificationItem[]>('/api/notifications', {
                signal,
                params: { limit: 50, tab },
            });
            return Array.isArray(response.data) ? response.data : [];
        },
        staleTime: 20_000,
    });
    const items = notifications.data ?? [];

    const markAllRead = async () => {
        await api.put('/api/notifications/read-all');
        queryClient.setQueryData<NotificationItem[]>(['notifications', 'all'], (current) => current?.map((item) => ({ ...item, read: true })) ?? []);
        queryClient.setQueryData<NotificationItem[]>(['notifications', 'mentions'], (current) => current?.map((item) => ({ ...item, read: true })) ?? []);
        queryClient.setQueryData(['notifications', 'unread-count'], 0);
    };

    const openNotification = async (item: NotificationItem) => {
        setBusyId(item.id);
        try {
            if (!item.read) {
                await api.put(`/api/notifications/${item.id}/read`);
                queryClient.setQueryData<number>(['notifications', 'unread-count'], (count) => Math.max(0, (count ?? 0) - 1));
                queryClient.setQueryData<NotificationItem[]>(['notifications', tab], (current) => current?.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry) ?? []);
            }
        } finally {
            setBusyId(null);
        }
        if (item.type === 'ADMIN_MESSAGE') {
            navigate(item.logId ? `/logs?open=${item.logId}` : '/logs');
        } else if (item.contentId) {
            navigate(item.commentId ? `/read/${item.contentId}#comments` : `/read/${item.contentId}`);
        } else if (item.actorUserId) {
            navigate(`/profile/${item.actorUserId}`);
        }
    };

    return (
        <section className="mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-[#242424] bg-black">
            <header className="sticky top-0 z-10 border-b border-[#242424] bg-black/95 px-5 pt-4 backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#ff1744]">Aktivitas akun</p>
                        <h1 className="m-0 mt-1 text-xl font-extrabold text-white">Notifikasi</h1>
                    </div>
                    <button type="button" onClick={() => void markAllRead()} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#333] px-3 text-xs font-semibold text-[#aaa] transition-colors hover:border-[#ff1744]/60 hover:text-white">
                        <CheckCheck size={15} />
                        Tandai dibaca
                    </button>
                </div>
                <div className="grid grid-cols-2">
                    <TabButton active={tab === 'all'} icon={<Bell size={16} />} label="Semua" onClick={() => setTab('all')} />
                    <TabButton active={tab === 'mentions'} icon={<AtSign size={16} />} label="Sebutan" onClick={() => setTab('mentions')} />
                </div>
            </header>

            {notifications.isLoading ? (
                <div className="grid gap-3 p-5" aria-busy="true">{[0, 1, 2].map((key) => <div key={key} className="h-24 animate-pulse rounded-xl bg-[#151515]" />)}</div>
            ) : notifications.isError ? (
                <div className="px-6 py-20 text-center text-sm text-[#999]">Notifikasi gagal dimuat. Coba buka halaman ini lagi.</div>
            ) : items.length === 0 ? (
                <div className="px-6 py-20 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#151515] text-[#777]">{tab === 'mentions' ? <AtSign size={20} /> : <Bell size={20} />}</div>
                    <h2 className="text-base font-bold text-white">{tab === 'mentions' ? 'Belum ada sebutan' : 'Belum ada notifikasi'}</h2>
                    <p className="mt-2 text-sm text-[#777]">{tab === 'mentions' ? 'Sebutan nama pengguna akan muncul di sini.' : 'Tulisan baru dari akun yang kamu ikuti dan aktivitas di tulisanmu akan muncul di sini.'}</p>
                </div>
            ) : (
                <div className="divide-y divide-[#222]">
                    {items.map((item) => (
                        <article key={item.id} className={`flex gap-3 px-4 py-4 transition-colors hover:bg-white/[0.04] sm:px-5 ${item.read ? '' : 'bg-[#12070a]'}`}>
                            <NotificationTypeIcon type={item.type} />
                            <div role="button" tabIndex={0} onClick={() => void openNotification(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openNotification(item); } }} className={`min-w-0 flex-1 cursor-pointer text-left ${busyId === item.id ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <p className="m-0 font-sans text-sm leading-6 text-[#ddd]">
                                        {item.type === 'MENTION' ? <MentionText text={item.message} /> : <><strong className="font-bold text-white">{item.title}</strong>{item.message ? <span className="text-[#aaa]"> · <MentionText text={item.message} /></span> : null}</>}
                                    </p>
                                    {!item.read && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#ff1744]" />}
                                </div>
                                {item.contentTitle && <p className="mt-1 line-clamp-2 text-sm font-semibold text-sky-400">{item.contentTitle}</p>}
                                <div className="mt-2 flex items-center gap-2 text-xs text-[#777]">
                                    <span className="truncate">{item.actorName || item.title || 'CodeXAvernico'}</span>
                                    <span aria-hidden="true">·</span>
                                    <time className="flex-shrink-0">{formatAge(item.createdAt)}</time>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
    return <button type="button" onClick={onClick} className={`relative flex min-h-12 items-center justify-center gap-2 px-2 text-sm font-bold transition-colors ${active ? 'text-white' : 'text-[#777] hover:bg-white/5 hover:text-white'}`}>
        {icon}<span>{label}</span>{active && <span className="absolute inset-x-8 bottom-0 h-1 rounded-full bg-[#ff1744]" />}
    </button>;
}

function NotificationTypeIcon({ type }: { type: NotificationItem['type'] }) {
    const Icon = type === 'MENTION' ? AtSign : type === 'UPVOTE' ? Heart : type === 'CONTENT' ? FileText : type === 'COMMENT' ? MessageSquare : ShieldAlert;
    const color = type === 'UPVOTE' ? 'text-pink-500' : type === 'CONTENT' ? 'text-sky-400' : 'text-[#ff1744]';
    return <span className={`mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#171717] ${color}`}><Icon size={18} /></span>;
}

function formatAge(dateString?: string) {
    if (!dateString) return 'Baru saja';
    const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60_000));
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} mnt`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours} jam`;
    return `${Math.floor(hours / 24)} hari`;
}
