import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, MessageSquare, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { NotificationItem } from '../types/forum';
import LoadingSpinner from './LoadingSpinner';

export default function NotificationBell() {
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchUnread = async () => {
        try {
            const response = await api.get<{ count: number }>('/api/notifications/unread-count');
            setUnreadCount(response.data.count ?? 0);
        } catch {
            setUnreadCount(0);
        }
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const response = await api.get<NotificationItem[]>('/api/notifications', { params: { limit: 30 } });
            setItems(Array.isArray(response.data) ? response.data : []);
            await fetchUnread();
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchUnread();
        const timer = window.setInterval(() => void fetchUnread(), 30000);
        return () => window.clearInterval(timer);
    }, []);

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
        setOpen((current) => {
            const next = !current;
            if (next) {
                void fetchItems();
            }
            return next;
        });
    };

    const markAllRead = async () => {
        await api.put('/api/notifications/read-all');
        setItems((current) => current.map((item) => ({ ...item, read: true })));
        setUnreadCount(0);
    };

    const openNotification = async (notification: NotificationItem) => {
        if (!notification.read) {
            await api.put(`/api/notifications/${notification.id}/read`);
            setUnreadCount((count) => Math.max(0, count - 1));
            setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
        }
        if (notification.type === 'ADMIN_MESSAGE') {
            navigate(notification.logId ? `/logs?open=${notification.logId}` : '/logs');
            setOpen(false);
            return;
        }
        if (notification.contentId) {
            navigate(`/read/${notification.contentId}`);
            setOpen(false);
        }
    };

    return (
        <div ref={panelRef} className="relative">
            <button
                type="button"
                onClick={toggleOpen}
                className="relative flex h-9 w-9 items-center justify-center border border-[#2a2a2a] bg-[#181818] text-[#888] transition-all hover:border-[#e60000]/60 hover:text-white"
                title="Notifications"
            >
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center bg-[#e60000] px-1 font-mono text-[9px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 z-[80] w-[min(88vw,380px)] border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
                        <div>
                            <h2 className="m-0 font-mono text-xs font-black uppercase tracking-widest text-white">Notifications</h2>
                            <p className="m-0 font-mono text-[9px] uppercase text-[#555]">Auto purge after 7 days</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void markAllRead()}
                            className="flex items-center gap-1 border border-[#333] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-white"
                        >
                            <CheckCheck size={12} />
                            Read
                        </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {loading ? (
                            <LoadingSpinner compact label="Syncing" />
                        ) : items.length === 0 ? (
                            <div className="px-4 py-10 text-center font-mono text-[10px] uppercase tracking-widest text-[#444]">[ No Signal ]</div>
                        ) : (
                            items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => void openNotification(item)}
                                    className={`flex w-full gap-3 border-b border-[#1e1e1e] px-4 py-3 text-left transition-all hover:bg-[#151515] ${
                                        item.read ? 'opacity-65' : 'bg-[#160909]'
                                    }`}
                                >
                                    <NotificationIcon type={item.type} />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center justify-between gap-3">
                                            <p className="m-0 truncate font-mono text-[11px] font-black uppercase text-white">
                                                {item.title || (item.type === 'COMMENT' ? 'Komentar baru' : 'Pesan admin')}
                                            </p>
                                            {!item.read && <span className="h-2 w-2 flex-shrink-0 bg-[#e60000]" />}
                                        </div>
                                        <p className="m-0 line-clamp-2 font-sans text-xs leading-5 text-[#aaa]">{item.message}</p>
                                        <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[9px] uppercase text-[#555]">
                                            <span className="truncate">{item.contentTitle || item.actorName || 'System'}</span>
                                            <span className="flex-shrink-0">{formatAge(item.createdAt)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationIcon({ type }: { type: NotificationItem['type'] }) {
    const Icon = type === 'COMMENT' ? MessageSquare : ShieldAlert;
    return (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[#333] bg-[#111] text-[#e60000]">
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
