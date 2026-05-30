import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBigDown, ArrowBigUp, Eye, MessageSquare, Trash2 } from 'lucide-react';
import axios from 'axios';
import api from '../lib/api';
import { sanitizeArticle } from '../utils/sanitize';
import type { CommentItem, ContentItem, ContentStats, CurrentUser, VoteDirection } from '../types/forum';

export default function ReadPage({ user }: { user: CurrentUser | null }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [content, setContent] = useState<ContentItem | null>(null);
    const [stats, setStats] = useState<ContentStats | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [commentBody, setCommentBody] = useState('');
    const [busy, setBusy] = useState(false);

    const fetchComments = useCallback(() => {
        if (!id) return Promise.resolve();
        return api.get<CommentItem[]>(`/content/${id}/comments`)
            .then(res => setComments(Array.isArray(res.data) ? res.data : []));
    }, [id]);

    const fetchStats = useCallback(() => {
        if (!id) return Promise.resolve();
        return api.get<ContentStats>(`/content/${id}/stats`)
            .then(res => setStats(res.data));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        api.get<ContentItem>(`/content/${id}`)
            .then(res => {
                setContent(res.data);
                setStats({
                    idContent: res.data.idContent,
                    viewCount: res.data.viewCount,
                    upCount: res.data.upCount,
                    downCount: res.data.downCount,
                    commentCount: res.data.commentCount,
                    userVote: res.data.userVote,
                });
            })
            .catch(() => setContent(null));
        void fetchComments();
    }, [id, fetchComments]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void fetchStats();
            void fetchComments();
        }, 5000);
        return () => window.clearInterval(timer);
    }, [fetchComments, fetchStats]);

    const safeBody = useMemo(() => sanitizeArticle(content?.paragrafs), [content?.paragrafs]);

    const handleVote = async (vote: VoteDirection) => {
        if (!id) return;
        if (!user) {
            window.alert('Guest hanya bisa membaca. Login dulu untuk vote.');
            return;
        }
        setBusy(true);
        try {
            const response = await api.post<ContentStats>(`/content/${id}/vote`, { vote });
            setStats(response.data);
        } catch (error) {
            handleMutationError(error);
        } finally {
            setBusy(false);
        }
    };

    const handleComment = async (parentId?: string, body?: string) => {
        if (!id) return;
        if (!user) {
            window.alert('Guest hanya bisa membaca. Login dulu untuk komentar.');
            return;
        }
        const payload = (body ?? commentBody).trim();
        if (!payload) return;
        try {
            await api.post(`/content/${id}/comments`, { body: payload, parentId });
            setCommentBody('');
            await fetchComments();
            await fetchStats();
        } catch (error) {
            handleMutationError(error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!id) return;
        try {
            await api.delete(`/content/${id}/comments/${commentId}`);
            await fetchComments();
            await fetchStats();
        } catch (error) {
            handleMutationError(error);
        }
    };

    if (!content) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#0a0a0a] font-mono text-[#e60000]">
                <div className="flex animate-pulse flex-col items-center">
                    <p className="mb-2 tracking-[0.5em]">[ DECRYPTING_SECURE_FILE ]</p>
                    <div className="relative h-1 w-48 overflow-hidden bg-[#1a1a1a]">
                        <div className="absolute inset-0 animate-[loading_2s_infinite] bg-[#e60000]" />
                    </div>
                </div>
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#111] p-4 font-mono text-[#eee] md:p-10">
            <div className="pointer-events-none fixed inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%]" />

            <div className="relative z-20 mx-auto max-w-4xl">
                <div className="mb-6 flex items-center justify-between border-b border-[#222] pb-2 text-[10px] text-[#444]">
                    <div className="flex flex-wrap gap-4">
                        <span className="font-bold text-[#e60000]">STATUS: ENCRYPTED_ACCESS</span>
                        <span>CLEARANCE: LEVEL_4</span>
                    </div>
                    <div className="hidden md:block">TERMINAL_ID: CXA-00{id?.substring(0, 2)}</div>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="group mb-8 flex items-center gap-2 text-[#888] transition-all hover:text-white"
                >
                    <span className="h-2 w-2 bg-[#e60000] group-hover:animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest">{'[<]'} Return to Database</span>
                </button>

                <main className="border border-[#2a2a2a] bg-[#181818] shadow-2xl">
                    <header className="border-b border-[#2a2a2a] p-8 md:p-12">
                        <div className="mb-4">
                            <span className="bg-[#e60000] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                                {content.kategori || 'Classified'}
                            </span>
                        </div>
                        <h1 className="mb-6 break-words text-3xl font-black uppercase leading-none tracking-normal text-white md:text-5xl">
                            {content.head}
                        </h1>
                        <div className="grid grid-cols-2 gap-4 text-[9px] font-bold uppercase text-[#666] md:grid-cols-4">
                            <Meta label="Subject_ID" value={`#${id?.substring(0, 8)}...`} />
                            <Meta label="Author_Ref" value={content.user?.name || 'Unknown'} />
                            <Meta label="Format" value="Digital_Archive" />
                            <Meta label="Encryption" value="Active" danger />
                        </div>
                    </header>

                    <div
                        className="whitespace-pre-wrap p-8 text-justify font-sans text-lg leading-relaxed text-[#ccc] selection:bg-[#e60000] selection:text-white md:p-12"
                        dangerouslySetInnerHTML={{ __html: safeBody }}
                    />

                    <footer className="flex flex-col gap-4 border-t border-[#2a2a2a] bg-[#1a1a1a]/50 p-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-4 text-[#777]">
                            <Counter icon={<Eye size={16} />} label="READ" value={stats?.viewCount ?? content.viewCount} />
                            <VoteButton active={stats?.userVote === 'UP'} disabled={busy} icon={<ArrowBigUp size={18} />} value={stats?.upCount ?? content.upCount} onClick={() => void handleVote('UP')} />
                            <VoteButton active={stats?.userVote === 'DOWN'} disabled={busy} icon={<ArrowBigDown size={18} />} value={stats?.downCount ?? content.downCount} onClick={() => void handleVote('DOWN')} />
                            <Counter icon={<MessageSquare size={16} />} label="COMMENTS" value={stats?.commentCount ?? content.commentCount} />
                        </div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#444]">
                            End_Of_Transmission
                        </p>
                    </footer>
                </main>

                <section className="mt-8 border border-[#2a2a2a] bg-[#151515] p-6">
                    <div className="mb-6 flex items-center justify-between border-b border-[#2a2a2a] pb-4">
                        <h2 className="font-mono text-lg font-black uppercase tracking-widest text-white">Comment Thread</h2>
                        <span className="font-mono text-[10px] font-bold text-[#666]">{stats?.commentCount ?? 0} ACTIVE</span>
                    </div>

                    <div className="mb-8 flex flex-col gap-3">
                        <textarea
                            value={commentBody}
                            onChange={(event) => setCommentBody(event.target.value)}
                            placeholder={user ? 'Add field note...' : 'Login required to comment...'}
                            disabled={!user}
                            className="min-h-24 w-full resize-y border border-[#333] bg-[#0f0f0f] p-3 font-sans text-sm leading-6 text-white outline-none focus:border-[#e60000] disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => void handleComment()}
                            disabled={!user || !commentBody.trim()}
                            className="self-end border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#444]"
                        >
                            Dispatch Comment
                        </button>
                    </div>

                    <div className="space-y-4">
                        {comments.length === 0 ? (
                            <div className="border border-dashed border-[#2a2a2a] py-12 text-center font-mono text-xs uppercase tracking-widest text-[#444]">
                                [ Thread_Empty ]
                            </div>
                        ) : (
                            comments.map(comment => (
                                <CommentNode
                                    key={comment.id}
                                    comment={comment}
                                    user={user}
                                    depth={0}
                                    onReply={handleComment}
                                    onDelete={handleDeleteComment}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function handleMutationError(error: unknown) {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        window.alert('Session atau token keamanan tidak valid. Silakan login ulang lalu coba lagi.');
        return;
    }
    window.alert('Request gagal diproses. Coba beberapa saat lagi.');
}

function Meta({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
    return (
        <div className="flex flex-col">
            <span>{label}</span>
            <span className={danger ? 'text-[#e60000]' : 'text-white'}>{value}</span>
        </div>
    );
}

function Counter({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return (
        <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase" title={label}>
            {icon}
            <span>{value}</span>
        </div>
    );
}

function VoteButton({ active, disabled, icon, value, onClick }: { active: boolean; disabled: boolean; icon: ReactNode; value: number; onClick: () => void }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`flex items-center gap-1 border px-2 py-1 font-mono text-[10px] font-black transition-all disabled:cursor-wait ${
                active ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#333] text-[#777] hover:border-[#e60000] hover:text-white'
            }`}
        >
            {icon}
            {value}
        </button>
    );
}

function CommentNode({
    comment,
    user,
    depth,
    onReply,
    onDelete,
}: {
    comment: CommentItem;
    user: CurrentUser | null;
    depth: number;
    onReply: (parentId?: string, body?: string) => Promise<void>;
    onDelete: (commentId: string) => Promise<void>;
}) {
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const canDelete = Boolean(user && !comment.deleted && (user.role === 'ADMIN' || user.userID === comment.user?.userID));

    const submitReply = async () => {
        if (!replyBody.trim()) return;
        await onReply(comment.id, replyBody);
        setReplyBody('');
        setReplyOpen(false);
    };

    return (
        <div className="border-l border-[#333] pl-4" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
            <div className={`p-4 ${comment.adminHighlighted ? 'border border-[#e60000] bg-[#190707]' : 'bg-[#111]'}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 overflow-hidden border border-[#333] bg-[#222]">
                            {comment.user?.picture ? (
                                <img src={comment.user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : null}
                        </div>
                        <div>
                            <p className="m-0 font-mono text-[11px] font-black uppercase text-white">{comment.user?.name || 'UNKNOWN'}</p>
                            <p className="m-0 font-mono text-[9px] uppercase text-[#555]">{formatCommentDate(comment.createdAt)}</p>
                        </div>
                    </div>
                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => void onDelete(comment.id)}
                            className="flex items-center gap-1 border border-[#333] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#777] transition-all hover:border-[#e60000] hover:text-[#e60000]"
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    )}
                </div>
                {comment.adminHighlighted && !comment.deleted && (
                    <span className="mb-2 inline-flex border border-[#e60000] px-2 py-0.5 font-mono text-[9px] font-black uppercase text-[#e60000]">
                        Admin Highlight
                    </span>
                )}
                <p className={`whitespace-pre-wrap font-sans text-sm leading-6 ${comment.deleted ? 'text-[#555]' : 'text-[#ccc]'}`}>
                    {comment.body}
                </p>
                {!comment.deleted && (
                    <button
                        type="button"
                        onClick={() => user ? setReplyOpen(!replyOpen) : window.alert('Guest hanya bisa membaca. Login dulu untuk membalas komentar.')}
                        className="mt-3 font-mono text-[10px] font-black uppercase text-[#e60000] hover:text-white"
                    >
                        Reply
                    </button>
                )}
                {replyOpen && (
                    <div className="mt-3 flex flex-col gap-2">
                        <textarea
                            value={replyBody}
                            onChange={(event) => setReplyBody(event.target.value)}
                            className="min-h-20 resize-y border border-[#333] bg-[#0b0b0b] p-3 font-sans text-sm text-white outline-none focus:border-[#e60000]"
                            placeholder="Write reply..."
                        />
                        <button
                            type="button"
                            onClick={() => void submitReply()}
                            className="self-end border border-[#e60000] px-4 py-1.5 font-mono text-[9px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                        >
                            Send Reply
                        </button>
                    </div>
                )}
            </div>
            {comment.replies?.length > 0 && (
                <div className="mt-3 space-y-3">
                    {comment.replies.map(reply => (
                        <CommentNode
                            key={reply.id}
                            comment={reply}
                            user={user}
                            depth={Math.min(depth + 1, 5)}
                            onReply={onReply}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function formatCommentDate(dateString?: string) {
    if (!dateString) return 'NO DATE';
    return new Date(dateString).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}
