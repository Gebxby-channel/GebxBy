import { useEffect, useRef, useState } from 'react';
import { AtSign, Bell, CheckCheck, MessageSquare, ShieldAlert, Trash2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { NotificationItem } from '../types/forum';
import LoadingSpinner from './LoadingSpinner';
import { useFeedback } from './feedback';
import { LazyRenderList } from './LazyRender';

export default function NotificationBell() {
    const navigate = useNavigate();
    const feedback = useFeedback();
    const queryClient = useQueryClient();
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [clearing, setClearing] = useState(false);
    const unreadQuery = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async ({ signal }) => {
            const response = await api.get<{ count: number }>('/api/notifications/unread-count', { signal });
            return response.data.count ?? 0;
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
    const itemsQuery = useQuery({
        queryKey: ['notifications', 'panel'],
        queryFn: async ({ signal }) => {
            const response = await api.get<NotificationItem[]>('/api/notifications', {
                signal,
                params: { limit: 30 },
            });
            return Array.isArray(response.data) ? response.data : [];
        },
        enabled: open,
        staleTime: 15_000,
    });
    const unreadCount = unreadQuery.data ?? 0;
    const items = itemsQuery.data ?? [];

    useEffect(() => {
        const closeWhenOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', closeWhenOutside);
        return () => document.removeEventListener('mousedown', closeWhenOutside);
    }, []);

    const toggleOpen = () => {
        setOpen((current) => !current);
    };

    const markAllRead = async () => {
        await api.put('/api/notifications/read-all');
        queryClient.setQueryData<NotificationItem[]>(['notifications', 'panel'], (current) => current?.map((item) => ({ ...item, read: true })) ?? []);
        queryClient.setQueryData(['notifications', 'unread-count'], 0);
    };

    const clearNotifications = async () => {
        const accepted = await feedback.confirm({
            title: 'Clear Notifications',
            message: 'Semua notifikasi akun ini akan dihapus permanen dari database.',
            confirmLabel: 'Clear',
            danger: true,
        });
        if (!accepted) return;
        setClearing(true);
        try {
            const response = await api.delete<{ deleted: number }>('/api/notifications');
            queryClient.setQueryData<NotificationItem[]>(['notifications', 'panel'], []);
            queryClient.setQueryData(['notifications', 'unread-count'], 0);
            await queryClient.invalidateQueries({ queryKey: ['notifications'] });
            feedback.toast(`${response.data.deleted ?? 0} notifikasi dihapus permanen.`, 'success');
        } catch {
            feedback.toast('Notifikasi gagal dibersihkan.', 'error');
        } finally {
            setClearing(false);
        }
    };

    const openNotification = async (notification: NotificationItem) => {
        if (!notification.read) {
            await api.put(`/api/notifications/${notification.id}/read`);
            queryClient.setQueryData<number>(['notifications', 'unread-count'], (count) => Math.max(0, (count ?? 0) - 1));
            queryClient.setQueryData<NotificationItem[]>(['notifications', 'panel'], (current) => current?.map((item) => item.id === notification.id ? { ...item, read: true } : item) ?? []);
        }
        if (notification.type === 'ADMIN_MESSAGE') {
            navigate(notification.logId ? `/logs?open=${notification.logId}` : '/logs');
            setOpen(false);
            return;
        }
        if (notification.contentId) {
            navigate(notification.commentId ? `/read/${notification.contentId}#comments` : `/read/${notification.contentId}`);
            setOpen(false);
        }
    };

    return (
        <div ref={panelRef} className="relative">
            <button
                type="button"
                onClick={toggleOpen}
                className="relative flex h-9 w-9 items-center justify-center border border-[#2a2a2a] bg-[#181818] text-[#888] transition-all hover:border-[#ff1744]/60 hover:text-white"
                title="Notifications"
                aria-label="Open notifications"
            >
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center bg-[#ff1744] px-1 font-mono text-[9px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed left-3 right-3 top-24 z-[120] mx-auto flex max-h-[calc(100dvh-7rem)] w-auto max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl md:absolute md:left-auto md:right-0 md:top-12 md:mx-0 md:max-h-[min(75vh,560px)] md:w-[min(88vw,380px)]">
                    <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-[#2a2a2a] px-4 py-3">
                        <div>
                            <h2 className="m-0 font-mono text-xs font-black uppercase tracking-widest text-white">Notifications</h2>
                            <p className="m-0 font-mono text-[9px] uppercase text-[#555]">Auto purge after 7 days</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => void markAllRead()}
                                disabled={clearing}
                                className="flex items-center gap-1 border border-[#333] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#777] hover:border-[#ff1744] hover:text-white disabled:cursor-wait disabled:opacity-50"
                            >
                                <CheckCheck size={12} />
                                Read
                            </button>
                            <button
                                type="button"
                                onClick={() => void clearNotifications()}
                                disabled={clearing || items.length === 0}
                                className="flex items-center gap-1 border border-[#333] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#777] hover:border-[#ff1744] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Trash2 size={12} />
                                Clear
                            </button>
                            <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777] hover:bg-white/10 hover:text-white" aria-label="Tutup notifikasi">
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:max-h-[420px]">
                        {itemsQuery.isLoading ? (
                            <div className="min-h-[160px]">
                                <LoadingSpinner compact label="Syncing" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="min-h-[160px] px-4 py-10 text-center font-mono text-[10px] uppercase tracking-widest text-[#444]">[ No Signal ]</div>
                        ) : (
                            <LazyRenderList
                                items={items}
                                getKey={(item) => item.id}
                                estimateSize={96}
                                eagerCount={5}
                                className="contents"
                                renderItem={(item) => (
                                    <article
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => void openNotification(item)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                void openNotification(item);
                                            }
                                        }}
                                        className={`flex w-full gap-3 border-b border-[#1e1e1e] px-4 py-3 text-left transition-all hover:bg-[#151515] ${
                                            item.read ? 'opacity-65' : 'bg-[#160909]'
                                        }`}
                                    >
                                        <NotificationIcon type={item.type} />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <p className="m-0 truncate font-mono text-[11px] font-black uppercase text-white">
                                                    {item.title || (item.type === 'COMMENT' ? 'Komentar baru' : item.type === 'MENTION' ? 'Kamu disebut' : 'Pesan admin')}
                                                </p>
                                                {!item.read && <span className="h-2 w-2 flex-shrink-0 bg-[#ff1744]" />}
                                            </div>
                                            <p className="m-0 line-clamp-2 font-sans text-xs leading-5 text-[#aaa]">{item.message}</p>
                                            <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[9px] uppercase text-[#555]">
                                                {item.actorUserId && item.actorName ? (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            navigate(`/profile/${item.actorUserId}`);
                                                            setOpen(false);
                                                        }}
                                                        className="truncate font-mono uppercase text-[#777] hover:text-[#ff1744]"
                                                    >
                                                        {item.actorName}
                                                    </button>
                                                ) : (
                                                    <span className="truncate">{item.contentTitle || item.actorName || 'System'}</span>
                                                )}
                                                <span className="flex-shrink-0">{formatAge(item.createdAt)}</span>
                                            </div>
                                        </div>
                                    </article>
                                )}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
    const Icon = type === 'COMMENT' ? MessageSquare : type === 'MENTION' ? AtSign : ShieldAlert;
    return (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[#333] bg-[#111] text-[#ff1744]">
            <Icon size={15} />
        </div>
    );
}

function formatAge(dateString?: string) {
    if (!dateString) return 'now';
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}
