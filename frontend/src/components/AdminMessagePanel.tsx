import { useEffect, useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import api, { cachedGet, invalidateApiCache } from '../lib/api';
import type { AnnouncementItem, CurrentUser } from '../types/forum';
import { useFeedback } from './feedback';

type BroadcastType = 'MESSAGE' | 'ANNOUNCEMENT_EVENT';

export default function AdminMessagePanel({ user }: { user: CurrentUser }) {
    const feedback = useFeedback();
    const [users, setUsers] = useState<CurrentUser[]>([]);
    const [recipientId, setRecipientId] = useState('');
    const [broadcastType, setBroadcastType] = useState<BroadcastType>('MESSAGE');
    const [title, setTitle] = useState('Peringatan admin');
    const [message, setMessage] = useState('');
    const [latestAnnouncement, setLatestAnnouncement] = useState<AnnouncementItem | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        api.get<CurrentUser[]>('/api/admin/users')
            .then((response) => {
                const data = Array.isArray(response.data) ? response.data : [];
                setUsers(data);
                setRecipientId('ALL');
            })
            .catch(() => setUsers([]));
        void fetchLatestAnnouncement();
    }, []);

    const fetchLatestAnnouncement = async (force = false) => {
        try {
            const data = await cachedGet<AnnouncementItem | ''>('/api/announcements/latest', undefined, {
                ttlMs: 60_000,
                scope: 'public',
                force,
            });
            setLatestAnnouncement(isAnnouncement(data) ? data : null);
        } catch {
            setLatestAnnouncement(null);
        }
    };

    const sendMessage = async () => {
        if ((!recipientId && broadcastType === 'MESSAGE') || !message.trim()) return;
        setSending(true);
        try {
            if (broadcastType === 'ANNOUNCEMENT_EVENT') {
                await api.post('/api/admin/announcements', { title, message });
                invalidateApiCache('/api/announcements/latest');
            } else if (recipientId === 'ALL') {
                await api.post('/api/admin/notifications/broadcast', { title, message });
                invalidateApiCache('/api/announcements/latest');
            } else {
                await api.post(`/api/admin/users/${recipientId}/notifications`, { title, message });
            }
            setMessage('');
            await fetchLatestAnnouncement(true);
            feedback.toast(broadcastType === 'ANNOUNCEMENT_EVENT' ? 'Announcement homepage berhasil dipublish.' : 'Pesan admin berhasil dikirim.', 'success');
        } finally {
            setSending(false);
        }
    };

    const deleteLatestAnnouncement = async () => {
        if (!latestAnnouncement) return;
        const accepted = await feedback.confirm({
            title: 'Hapus Announcement',
            message: 'Announcement akan dihapus permanen dari homepage dan database.',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/announcements/${latestAnnouncement.id}`);
        invalidateApiCache('/api/announcements/latest');
        await fetchLatestAnnouncement(true);
    };

    return (
        <section className="mb-10 border border-[#2a2a2a] bg-[#151515] p-5">
            <div className="mb-5 border-b border-[#2a2a2a] pb-3">
                <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Admin Broadcast</h2>
                <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">Message masuk notif/log, Announcement Event tampil di homepage</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[0.85fr_1fr_1fr]">
                <select
                    value={broadcastType}
                    onChange={(event) => {
                        const nextType = event.target.value as BroadcastType;
                        setBroadcastType(nextType);
                        setTitle(nextType === 'ANNOUNCEMENT_EVENT' ? 'Announcement Event' : 'Peringatan admin');
                    }}
                    className="border border-[#333] bg-[#101010] p-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                >
                    <option value="MESSAGE">Message</option>
                    <option value="ANNOUNCEMENT_EVENT">Announcement Event</option>
                </select>
                <select
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                    disabled={broadcastType === 'ANNOUNCEMENT_EVENT'}
                    className="border border-[#333] bg-[#101010] p-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                >
                    <option value="ALL">{broadcastType === 'ANNOUNCEMENT_EVENT' ? 'Homepage announcement slot' : 'All users - broadcast'}</option>
                    {users.map((target) => (
                        <option key={target.userID} value={target.userID}>
                            {target.name} - {target.email}
                        </option>
                    ))}
                </select>
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={120}
                    className="border border-[#333] bg-[#101010] p-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                    placeholder={broadcastType === 'ANNOUNCEMENT_EVENT' ? 'Judul announcement' : 'Judul pesan'}
                />
            </div>

            <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1000}
                className="mt-3 min-h-28 w-full resize-y border border-[#333] bg-[#101010] p-3 font-sans text-sm leading-6 text-white outline-none focus:border-[#e60000]"
                placeholder={broadcastType === 'ANNOUNCEMENT_EVENT' ? 'Tulis announcement event untuk homepage...' : 'Tulis pesan admin...'}
            />

            <div className="mt-3 flex justify-end">
                <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={(broadcastType === 'MESSAGE' && !recipientId) || !message.trim() || sending}
                    className="flex items-center gap-2 border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
                >
                    {broadcastType === 'ANNOUNCEMENT_EVENT' ? <Megaphone size={14} /> : <Send size={14} />}
                    {sending ? 'Sending' : broadcastType === 'ANNOUNCEMENT_EVENT' ? 'Publish Announcement' : 'Send Message'}
                </button>
            </div>

            {latestAnnouncement && (
                <div className="mt-5 border border-[#2a2a2a] bg-[#101010] p-4">
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <p className="m-0 font-mono text-[10px] font-black uppercase tracking-widest text-[#e60000]">Current Homepage Announcement</p>
                            <p className="m-0 mt-1 truncate font-mono text-xs font-black uppercase text-white">{latestAnnouncement.title || 'Announcement Event'}</p>
                        </div>
                        {latestAnnouncement.adminUserId === user.userID ? (
                            <button
                                type="button"
                                onClick={() => void deleteLatestAnnouncement()}
                                className="flex h-9 items-center justify-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:bg-[#e60000] hover:text-white"
                            >
                                <Trash2 size={13} />
                                Delete
                            </button>
                        ) : (
                            <span className="border border-[#333] px-3 py-2 font-mono text-[9px] font-black uppercase text-[#555]">
                                Owner only
                            </span>
                        )}
                    </div>
                    <p className="m-0 line-clamp-3 font-sans text-sm leading-6 text-[#aaa]">{latestAnnouncement.message}</p>
                    <p className="m-0 mt-3 font-mono text-[9px] uppercase tracking-widest text-[#555]">
                        ~ from {latestAnnouncement.adminName || 'Admin'}
                    </p>
                </div>
            )}
        </section>
    );
}

function isAnnouncement(value: AnnouncementItem | '' | null | undefined): value is AnnouncementItem {
    return typeof value === 'object' && value !== null && typeof value.message === 'string';
}
