import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBigDown, ArrowBigUp, Eye, Flag, MessageSquare, Trash2 } from 'lucide-react';
import axios from 'axios';
import api, { cachedGet, invalidateApiCache } from '../lib/api';
import { sanitizeArticle } from '../utils/sanitize';
import type { CommentItem, ContentItem, ContentStats, CurrentUser, VoteDirection } from '../types/forum';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ReadPage({ user }: { user: CurrentUser | null }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [content, setContent] = useState<ContentItem | null>(null);
    const [stats, setStats] = useState<ContentStats | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [commentBody, setCommentBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [rootCommentPosting, setRootCommentPosting] = useState(false);
    const [commentNotice, setCommentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const commentSubmissionLocks = useRef(new Set<string>());
    const readCompletionRef = useRef<HTMLDivElement | null>(null);
    const viewRecordedRef = useRef<string | null>(null);

    const fetchComments = useCallback((force = false) => {
        if (!id) return Promise.resolve();
        return cachedGet<CommentItem[]>(`/content/${id}/comments`, undefined, {
            ttlMs: 10_000,
            force,
        })
            .then(data => setComments(Array.isArray(data) ? data : []));
    }, [id]);

    const fetchStats = useCallback(() => {
        if (!id) return Promise.resolve();
        return api.get<ContentStats>(`/content/${id}/stats`)
            .then(res => setStats(res.data));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        cachedGet<ContentItem>(`/content/${id}`, undefined, {
            ttlMs: 5 * 60_000,
            scope: user?.userID ?? 'guest',
        })
            .then(data => {
                setContent(data);
                setStats({
                    idContent: data.idContent,
                    viewCount: data.viewCount,
                    upCount: data.upCount,
                    downCount: data.downCount,
                    commentCount: data.commentCount,
                    userVote: data.userVote,
                });
            })
            .catch(() => setContent(null));

        void fetchComments();
    }, [id, fetchComments, fetchStats, user?.userID]);

    useEffect(() => {
        if (!id || !content || !readCompletionRef.current) return;
        viewRecordedRef.current = null;
        const sentinel = readCompletionRef.current;
        const observer = new IntersectionObserver((entries) => {
            const reachedEnd = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.6);
            if (!reachedEnd || viewRecordedRef.current === id) {
                return;
            }
            viewRecordedRef.current = id;
            api.post<ContentStats>(`/content/${id}/view`)
                .then(response => {
                    setStats(response.data);
                    invalidateContentCacheForMutation(id);
                })
                .catch(() => {
                    viewRecordedRef.current = null;
                    void fetchStats();
                });
        }, {
            threshold: 0.6,
            rootMargin: '0px 0px -8% 0px',
        });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [content, fetchStats, id]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void fetchStats();
            void fetchComments(true);
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
            invalidateContentCacheForMutation(id);
        } catch (error) {
            handleMutationError(error);
        } finally {
            setBusy(false);
        }
    };

    const handleComment = async (parentId?: string, body?: string) => {
        if (!id) return false;
        if (!user) {
            window.alert('Guest hanya bisa membaca. Login dulu untuk komentar.');
            return false;
        }
        const payload = (body ?? commentBody).trim();
        if (!payload) return false;
        const lockKey = `${parentId ?? 'root'}:${payload.toLocaleLowerCase('id-ID')}`;
        if (commentSubmissionLocks.current.has(lockKey)) {
            return false;
        }
        commentSubmissionLocks.current.add(lockKey);
        if (!parentId) {
            setRootCommentPosting(true);
        }
        setCommentNotice(null);
        try {
            const response = await api.post<CommentItem>(`/content/${id}/comments`, { body: payload, parentId });
            const alreadyRendered = threadContainsComment(comments, response.data.id);

            setComments((current) => mergeCommentIntoThread(current, response.data));
            invalidateApiCache(`/content/${id}/comments`);
            invalidateContentCacheForMutation(id);
            if (!parentId) {
                setCommentBody('');
            }
            if (!alreadyRendered) {
                setStats((current) => current ? { ...current, commentCount: current.commentCount + 1 } : current);
            }
            setCommentNotice({ type: 'success', message: alreadyRendered ? 'Komentar ini sudah tercatat.' : 'Komentar berhasil dikirim.' });
            void fetchStats();
            return true;
        } catch (error) {
            setCommentNotice({ type: 'error', message: getMutationErrorMessage(error) });
            return false;
        } finally {
            commentSubmissionLocks.current.delete(lockKey);
            if (!parentId) {
                setRootCommentPosting(false);
            }
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!id) return;
        try {
            await api.delete(`/content/${id}/comments/${commentId}`);
            invalidateApiCache(`/content/${id}/comments`);
            invalidateContentCacheForMutation(id);
            await fetchComments(true);
            await fetchStats();
        } catch (error) {
            handleMutationError(error);
        }
    };

    const handleReportContent = async () => {
        if (!id) return;
        if (!user) {
            window.alert('Login dulu untuk mengirim report.');
            return;
        }
        const reason = window.prompt('Alasan report tulisan ini:');
        if (!reason?.trim()) return;
        await api.post(`/api/logs/reports/content/${id}`, { reason });
        window.alert('Report masuk ke queue moderator/admin.');
    };

    const handleReportComment = async (commentId: string) => {
        if (!id) return;
        if (!user) {
            window.alert('Login dulu untuk mengirim report.');
            return;
        }
        const reason = window.prompt('Alasan report komentar ini:');
        if (!reason?.trim()) return;
        await api.post(`/api/logs/reports/content/${id}/comments/${commentId}`, { reason });
        window.alert('Report komentar masuk ke queue moderator/admin.');
    };

    if (!content) {
        return <LoadingSpinner label="Decrypting File" />;
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

                <div className="mb-8 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 text-[#888] transition-all hover:text-white"
                    >
                        <span className="h-2 w-2 bg-[#e60000] group-hover:animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest">{'[<]'} Return to Database</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleReportContent()}
                        className="flex h-8 items-center gap-2 border border-[#333] px-3 font-mono text-[9px] font-black uppercase text-[#777] transition-all hover:border-[#e60000] hover:text-[#e60000]"
                        title="Report writing"
                    >
                        <Flag size={13} />
                        Report
                    </button>
                </div>

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
                        className="p-8 text-justify font-sans text-lg leading-relaxed text-[#ccc] selection:bg-[#e60000] selection:text-white md:p-12 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#e60000] [&_blockquote]:pl-4 [&_br]:block [&_div]:mb-4 [&_h1]:mb-5 [&_h1]:text-3xl [&_h1]:font-black [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-black [&_li]:mb-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#333] [&_pre]:bg-black [&_pre]:p-4 [&_ul]:my-6 [&_ul]:pl-6"
                        dangerouslySetInnerHTML={{ __html: safeBody }}
                    />

                    {content.images?.length ? (
                        <section className="border-t border-[#2a2a2a] bg-[#101010] p-6 md:p-8">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-mono text-xs font-black uppercase tracking-widest text-white">Attached Visual Evidence</h2>
                                <span className="font-mono text-[10px] font-bold uppercase text-[#666]">{content.images.length} File</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {content.images.map((image, index) => (
                                    <figure key={image.id || `${content.idContent}-image-${index}`} className="m-0 overflow-hidden border border-[#333] bg-black">
                                        <img
                                            src={image.data}
                                            alt={image.alt || `${content.head} attachment ${index + 1}`}
                                            loading="lazy"
                                            decoding="async"
                                            className="max-h-[620px] w-full object-contain"
                                        />
                                        {image.alt && (
                                            <figcaption className="border-t border-[#222] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#777]">
                                                {image.alt}
                                            </figcaption>
                                        )}
                                    </figure>
                                ))}
                            </div>
                        </section>
                    ) : null}

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
                    <div ref={readCompletionRef} className="h-2" aria-hidden="true" />
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
                            disabled={!user || rootCommentPosting}
                            className="min-h-24 w-full resize-y border border-[#333] bg-[#0f0f0f] p-3 font-sans text-sm leading-6 text-white outline-none focus:border-[#e60000] disabled:opacity-50"
                        />
                        {commentNotice && (
                            <div className={`border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest ${
                                commentNotice.type === 'success'
                                    ? 'border-[#166534] bg-[#071407] text-[#4ade80]'
                                    : 'border-[#7f1d1d] bg-[#1a0707] text-[#ff5555]'
                            }`}>
                                {commentNotice.message}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => void handleComment()}
                            disabled={!user || !commentBody.trim() || rootCommentPosting}
                            className="self-end border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#444]"
                        >
                            {rootCommentPosting ? 'Posting...' : 'Dispatch Comment'}
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
                                    onReport={handleReportComment}
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
    window.alert(getMutationErrorMessage(error));
}

function invalidateContentCacheForMutation(contentId: string) {
    invalidateApiCache(`/content/${contentId}`);
    invalidateApiCache('/content/all-content');
    invalidateApiCache('/content/feed');
    invalidateApiCache('/content/analytics');
}

function getMutationErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
            return 'Komentar terlalu cepat. Tunggu sebentar sebelum mengirim lagi.';
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
            return 'Session atau token keamanan tidak valid. Silakan login ulang lalu coba lagi.';
        }
        if (error.response?.status === 423) {
            return 'Akun sedang disuspend sementara. Aksi ditahan.';
        }
        const data = error.response?.data;
        if (typeof data === 'string' && data.trim()) {
            return data;
        }
        if (typeof data === 'object' && data !== null && 'message' in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === 'string' && message.trim()) {
                return message;
            }
        }
    }
    return 'Request gagal diproses. Coba beberapa saat lagi.';
}

function threadContainsComment(thread: CommentItem[], commentId: string): boolean {
    return thread.some(comment => comment.id === commentId || threadContainsComment(comment.replies ?? [], commentId));
}

function mergeCommentIntoThread(thread: CommentItem[], nextComment: CommentItem): CommentItem[] {
    if (threadContainsComment(thread, nextComment.id)) {
        return thread;
    }
    if (!nextComment.parentId) {
        return [...thread, normalizeComment(nextComment)];
    }

    const { thread: nextThread, inserted } = insertReplyIntoThread(thread, nextComment.parentId, normalizeComment(nextComment));

    return inserted ? nextThread : [...nextThread, normalizeComment(nextComment)];
}

function normalizeComment(comment: CommentItem): CommentItem {
    return {
        ...comment,
        replies: comment.replies ?? [],
    };
}

function insertReplyIntoThread(thread: CommentItem[], parentId: string, reply: CommentItem): { thread: CommentItem[]; inserted: boolean } {
    let inserted = false;
    const nextThread = thread.map(comment => {
        if (comment.id === parentId) {
            inserted = true;
            return {
                ...comment,
                replies: [...(comment.replies ?? []), reply],
            };
        }

        const replies = comment.replies ?? [];
        if (replies.length === 0) {
            return comment;
        }

        const result = insertReplyIntoThread(replies, parentId, reply);
        if (result.inserted) {
            inserted = true;
            return { ...comment, replies: result.thread };
        }
        return comment;
    });

    return { thread: nextThread, inserted };
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
    onReport,
}: {
    comment: CommentItem;
    user: CurrentUser | null;
    depth: number;
    onReply: (parentId?: string, body?: string) => Promise<boolean>;
    onDelete: (commentId: string) => Promise<void>;
    onReport: (commentId: string) => Promise<void>;
}) {
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [replyPosting, setReplyPosting] = useState(false);
    const canDelete = Boolean(user && !comment.deleted && (user.role === 'ADMIN' || user.userID === comment.user?.userID));

    const submitReply = async () => {
        if (!replyBody.trim()) return;
        setReplyPosting(true);
        try {
            const posted = await onReply(comment.id, replyBody);
            if (posted) {
                setReplyBody('');
                setReplyOpen(false);
            }
        } finally {
            setReplyPosting(false);
        }
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
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void onReport(comment.id)}
                            className="flex items-center gap-1 border border-[#333] px-2 py-1 font-mono text-[9px] font-black uppercase text-[#777] transition-all hover:border-[#e60000] hover:text-[#e60000]"
                        >
                            <Flag size={12} />
                            Report
                        </button>
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
                            disabled={replyPosting}
                            className="min-h-20 resize-y border border-[#333] bg-[#0b0b0b] p-3 font-sans text-sm text-white outline-none focus:border-[#e60000]"
                            placeholder="Write reply..."
                        />
                        <button
                            type="button"
                            onClick={() => void submitReply()}
                            disabled={!replyBody.trim() || replyPosting}
                            className="self-end border border-[#e60000] px-4 py-1.5 font-mono text-[9px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#444]"
                        >
                            {replyPosting ? 'Posting...' : 'Send Reply'}
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
                            onReport={onReport}
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
