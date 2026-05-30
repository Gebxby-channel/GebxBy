import { useCallback, useEffect, useState } from 'react';
import { Ban, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import api from '../lib/api';
import type { CurrentUser } from '../types/forum';
import AdminMessagePanel from '../components/AdminMessagePanel';

export default function AdminPanelPage({ user }: { user: CurrentUser }) {
    const [users, setUsers] = useState<CurrentUser[]>([]);
    const [suspendHours, setSuspendHours] = useState(24);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get<CurrentUser[]>('/api/admin/users');
            setUsers(Array.isArray(response.data) ? response.data : []);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const suspendUser = async (target: CurrentUser) => {
        if (target.role === 'ADMIN') return;
        await api.post(`/api/admin/users/${target.userID}/suspend`, { hours: suspendHours });
        await fetchUsers();
    };

    const deleteUser = async (target: CurrentUser) => {
        if (target.userID === user.userID) return;
        if (!window.confirm(`Delete account ${target.email}?`)) return;
        await api.delete(`/api/admin/users/${target.userID}`);
        await fetchUsers();
    };

    return (
        <div className="w-full">
            <div className="mb-10 border-l-4 border-[#e60000] pl-6">
                <div className="mb-2 flex items-center gap-3 text-[#e60000]">
                    <ShieldCheck size={22} />
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.35em]">Role Verified</span>
                </div>
                <h1 className="font-mono text-3xl font-black uppercase tracking-widest text-white">Command Control</h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-tight text-[#666]">Admin operations // user safety // direct notifications</p>
            </div>

            <AdminMessagePanel />

            <section className="border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-5 flex flex-col gap-4 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">User Control</h2>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">Temporary suspend and account removal</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            max={720}
                            value={suspendHours}
                            onChange={(event) => setSuspendHours(Number(event.target.value))}
                            className="h-9 w-24 border border-[#333] bg-[#101010] px-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                            title="Suspend hours"
                        />
                        <button
                            type="button"
                            onClick={() => void fetchUsers()}
                            className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white"
                        >
                            <RefreshCcw size={13} />
                            Sync
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ Syncing Users ]</div>
                ) : users.length === 0 ? (
                    <div className="py-16 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Users ]</div>
                ) : (
                    <div className="grid gap-3">
                        {users.map((target) => {
                            const isSelf = target.userID === user.userID;
                            const isAdmin = target.role === 'ADMIN';
                            return (
                                <div key={target.userID} className="flex flex-col gap-4 border border-[#242424] bg-[#101010] p-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{target.name}</p>
                                            <span className={`border px-2 py-0.5 font-mono text-[9px] font-black uppercase ${isAdmin ? 'border-[#e60000] text-[#e60000]' : 'border-[#333] text-[#777]'}`}>
                                                {target.role}
                                            </span>
                                            {target.suspensionMarked && (
                                                <span className="border border-[#7f1d1d] bg-[#1a0707] px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#e60000]">
                                                    Marked
                                                </span>
                                            )}
                                        </div>
                                        <p className="m-0 truncate font-mono text-[10px] text-[#666]">{target.email}</p>
                                        <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#444]">
                                            {target.suspendedUntil ? `Suspended until ${formatDate(target.suspendedUntil)}` : 'Active'}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void suspendUser(target)}
                                            disabled={isAdmin}
                                            className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000] disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <Ban size={13} />
                                            Suspend
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteUser(target)}
                                            disabled={isSelf}
                                            className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                                        >
                                            <Trash2 size={13} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
