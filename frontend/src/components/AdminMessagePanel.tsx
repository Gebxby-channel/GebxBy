import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import api from '../lib/api';
import type { CurrentUser } from '../types/forum';

export default function AdminMessagePanel() {
    const [users, setUsers] = useState<CurrentUser[]>([]);
    const [recipientId, setRecipientId] = useState('');
    const [title, setTitle] = useState('Peringatan admin');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        api.get<CurrentUser[]>('/api/admin/users')
            .then((response) => {
                const data = Array.isArray(response.data) ? response.data : [];
                setUsers(data);
                setRecipientId('ALL');
            })
            .catch(() => setUsers([]));
    }, []);

    const sendMessage = async () => {
        if (!recipientId || !message.trim()) return;
        setSending(true);
        try {
            if (recipientId === 'ALL') {
                await api.post('/api/admin/notifications/broadcast', { title, message });
            } else {
                await api.post(`/api/admin/users/${recipientId}/notifications`, { title, message });
            }
            setMessage('');
            window.alert('Pesan admin berhasil dikirim.');
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="mb-10 border border-[#2a2a2a] bg-[#151515] p-5">
            <div className="mb-5 border-b border-[#2a2a2a] pb-3">
                <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Admin Broadcast</h2>
                <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">Direct notification message to selected user</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <select
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                    className="border border-[#333] bg-[#101010] p-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                >
                    <option value="ALL">All users - broadcast</option>
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
                    placeholder="Judul pesan"
                />
            </div>

            <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1000}
                className="mt-3 min-h-28 w-full resize-y border border-[#333] bg-[#101010] p-3 font-sans text-sm leading-6 text-white outline-none focus:border-[#e60000]"
                placeholder="Tulis pesan admin..."
            />

            <div className="mt-3 flex justify-end">
                <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!recipientId || !message.trim() || sending}
                    className="flex items-center gap-2 border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
                >
                    <Send size={14} />
                    {sending ? 'Sending' : 'Send Message'}
                </button>
            </div>
        </section>
    );
}
