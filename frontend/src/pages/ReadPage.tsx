import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBigDown, ArrowBigUp, Bookmark, BookmarkCheck, CalendarDays, Eye, Flag, MessageSquare, Trash2, UserRound } from 'lucide-react';
import axios from 'axios';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { invalidateApiCache } from '../lib/api';
import { sanitizeArticle } from '../utils/sanitize';
import type { CommentItem, CommentPagePayload, ContentImage, ContentItem, ContentStats, CurrentUser, PublicUser, VoteDirection } from '../types/forum';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFeedback } from '../components/feedback';
import { useRealtimeContentSubscription } from '../hooks/useRealtimeContentSubscription';
import { profilePathForUser } from '../utils/profilePath';
import { formatIndonesiaDate, formatIndonesiaShortTime } from '../utils/time';

type ReportTarget = { type: 'content' } | { type: 'comment'; commentId: string };

export default function ReadPage({ user }: { user: CurrentUser | null }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const feedback = useFeedback();
    const queryClient = useQueryClient();
    const [content, setContent] = useState<ContentItem | null>(null);
    const [stats, setStats] = useState<ContentStats | null>(null);
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [commentBody, setCommentBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [rootCommentPosting, setRootCommentPosting] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [commentNotice, setCommentNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const commentSubmissionLocks = useRef(new Set<string>());
    const readCompletionRef = useRef<HTMLDivElement | null>(null);
    const viewRecordedRef = useRef<string | null>(null);
    const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
    useRealtimeContentSubscription(id);

    const contentQuery = useQuery({
        queryKey: ['content-detail', id, user?.userID ?? 'guest'],
        enabled: Boolean(id),
        queryFn: async ({ signal }) => {
            const response = await api.get<ContentItem>(`/content/${id}`, { signal });
            return response.data;
        },
        staleTime: 5 * 60_000,
    });
    const commentsQuery = useInfiniteQuery({
        queryKey: ['content-comments-page', id],
        enabled: Boolean(id),
        initialPageParam: 0,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<CommentPagePayload>(`/content/${id}/comments/page`, {
                signal,
                params: { page: pageParam, limit: 20 },
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
        staleTime: 10_000,
        refetchInterval: 60_000,
    });
    const statsQuery = useQuery({
        queryKey: ['content-stats', id],
        enabled: Boolean(id),
        queryFn: async ({ signal }) => {
            const response = await api.get<ContentStats>(`/content/${id}/stats`, { signal });
            return response.data;
        },
        staleTime: 15_000,
        refetchInterval: 60_000,
    });

    const fetchComments = useCallback(async () => {
        if (!id) return;
        const response = await api.get<CommentPagePayload>(`/content/${id}/comments/page`, {
            params: { page: 0, limit: 20 },
        });
        const firstPage = response.data;
        setComments(firstPage.items ?? []);
        queryClient.setQueryData(['content-comments-page', id], {
            pages: [firstPage],
            pageParams: [0],
        });
    }, [id, queryClient]);

    const fetchStats = useCallback(async () => {
        if (!id) return;
        const data = await queryClient.fetchQuery({
            queryKey: ['content-stats', id],
            queryFn: async ({ signal }) => {
                const response = await api.get<ContentStats>(`/content/${id}/stats`, { signal });
                return response.data;
            },
            staleTime: 0,
        });
        setStats(data);
    }, [id, queryClient]);

    useEffect(() => {
        setContent(null);
        setComments([]);
        setStats(null);
        viewRecordedRef.current = null;
    }, [id]);

    useEffect(() => {
        if (!contentQuery.data) return;
        setContent(contentQuery.data);
        setStats((current) => current ?? {
            idContent: contentQuery.data.idContent,
            viewCount: contentQuery.data.viewCount,
            upCount: contentQuery.data.upCount,
            downCount: contentQuery.data.downCount,
            commentCount: contentQuery.data.commentCount,
            userVote: contentQuery.data.userVote,
        });
    }, [contentQuery.data]);

    useEffect(() => {
        if (contentQuery.isError) {
            setContent(null);
        }
    }, [contentQuery.isError]);

    useEffect(() => {
        if (commentsQuery.data) {
            setComments(mergeCommentPages(commentsQuery.data.pages));
        }
    }, [commentsQuery.data]);

    useEffect(() => {
        if (statsQuery.data) {
            setStats(statsQuery.data);
        }
    }, [statsQuery.data]);

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
                    queryClient.setQueryData(['content-stats', id], response.data);
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
    }, [content, fetchStats, id, queryClient]);

    const safeBody = useMemo(() => sanitizeArticle(content?.paragrafs), [content?.paragrafs]);

    useEffect(() => {
        setBookmarked(Boolean(id && user?.bookmarkedContentIds?.includes(id)));
    }, [id, user?.bookmarkedContentIds]);

    const handleVote = async (vote: VoteDirection) => {
        if (!id) return;
        if (!user) {
            feedback.toast('Guest hanya bisa membaca. Login dulu untuk vote.', 'info');
            return;
        }
        setBusy(true);
        try {
            const response = await api.post<ContentStats>(`/content/${id}/vote`, { vote });
            setStats(response.data);
            queryClient.setQueryData(['content-stats', id], response.data);
            void queryClient.invalidateQueries({ queryKey: ['feed-page'] });
            invalidateContentCacheForMutation(id);
        } catch (error) {
            feedback.toast(getMutationErrorMessage(error), 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleComment = async (parentId?: string, body?: string) => {
        if (!id) return false;
        if (!user) {
            feedback.toast('Guest hanya bisa membaca. Login dulu untuk komentar.', 'info');
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
            void queryClient.invalidateQueries({ queryKey: ['content-comments-page', id] });
            invalidateApiCache(`/content/${id}/comments`);
            invalidateContentCacheForMutation(id);
            if (!parentId) {
                setCommentBody('');
            }
            if (!alreadyRendered) {
                setStats((current) => current ? { ...current, commentCount: current.commentCount + 1 } : current);
            }
            setCommentNotice({ type: 'success', message: alreadyRendered ? 'Komentar ini sudah tercatat.' : 'Komentar berhasil dikirim.' });
            void queryClient.invalidateQueries({ queryKey: ['feed-page'] });
            void fetchStats();
            return true;
        } catch (error) {
            const message = getMutationErrorMessage(error);
            setCommentNotice({ type: 'error', message });
            feedback.toast(message, 'error');
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
        const accepted = await feedback.confirm({
            title: 'Hapus Komentar',
            message: 'Komentar akan dihapus dari thread. Aksi ini mengikuti izin pemilik komentar atau admin.',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        try {
            await api.delete(`/content/${id}/comments/${commentId}`);
            invalidateApiCache(`/content/${id}/comments`);
            invalidateContentCacheForMutation(id);
            await fetchComments();
            await fetchStats();
        } catch (error) {
            feedback.toast(getMutationErrorMessage(error), 'error');
        }
    };

    const handleReportContent = async () => {
        if (!id) return;
        if (!user) {
            feedback.toast('Login dulu untuk mengirim report.', 'info');
            return;
        }
        setReportTarget({ type: 'content' });
    };

    const handleReportComment = async (commentId: string) => {
        if (!id) return;
        if (!user) {
            feedback.toast('Login dulu untuk mengirim report.', 'info');
            return;
        }
        setReportTarget({ type: 'comment', commentId });
    };

    const submitReport = async (category: string, reason: string) => {
        if (!id || !reportTarget) return;
        if (reportTarget.type === 'comment') {
            await api.post(`/api/logs/reports/content/${id}/comments/${reportTarget.commentId}`, { category, reason });
        } else {
            await api.post(`/api/logs/reports/content/${id}`, { category, reason });
        }
        setReportTarget(null);
        feedback.toast('Report masuk ke queue moderator/admin.', 'success');
    };

    const handleBookmark = async () => {
        if (!id) return;
        if (!user) {
            feedback.toast('Login dulu untuk menyimpan bookmark.', 'info');
            return;
        }
        try {
            if (bookmarked) {
                await api.delete(`/api/user/bookmarks/${id}`);
                setBookmarked(false);
                feedback.toast('Bookmark dihapus dari profile.', 'success');
            } else {
                await api.post(`/api/user/bookmarks/${id}`);
                setBookmarked(true);
                feedback.toast('Tulisan tersimpan di bookmark profile.', 'success');
            }
            invalidateApiCache('/api/user/bookmarks');
        } catch (error) {
            feedback.toast(getMutationErrorMessage(error), 'error');
        }
    };

    const openUserProfile = (targetUserId?: string) => {
        const path = profilePathForUser(targetUserId, user?.userID);
        if (path) {
            navigate(path);
        }
    };

    if (!content) {
        return <LoadingSpinner label="Decrypting File" />;
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#111] p-4 font-mono text-[#eee] md:p-10">
            <div className="pointer-events-none fixed inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%]" />

            <div className="relative z-20 mx-auto max-w-5xl">
                <ArticleActionRail
                    stats={stats}
                    content={content}
                    busy={busy}
                    bookmarked={bookmarked}
                    onVote={handleVote}
                    onBookmark={handleBookmark}
                    onReport={handleReportContent}
                />

                <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#222] pb-4">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 text-[#888] transition-all hover:text-white"
                    >
                        <span className="h-2 w-2 bg-[#e60000] group-hover:animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest">{'[<]'} Return to Database</span>
                    </button>
                    <div className="hidden font-mono text-[10px] uppercase tracking-widest text-[#444] md:block">TERMINAL_ID: CXA-00{id?.substring(0, 2)}</div>
                </div>

                <main className="overflow-hidden border border-[#2a2a2a] bg-[#181818] shadow-2xl">
                    <header className="border-b border-[#2a2a2a] bg-[#131313] p-6 md:p-9">
                        <div className="mb-5 flex flex-wrap items-center gap-3">
                            <span className="border border-[#e60000] bg-[#e60000] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                                {content.kategori || 'Classified'}
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-[#666]">
                                <CalendarDays size={13} />
                                {formatArticleDate(content.createdAt)}
                            </span>
                            <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#444]">
                                #{id?.substring(0, 8)}
                            </span>
                        </div>
                        <h1 className="mb-6 max-w-4xl break-words font-mono text-3xl font-black uppercase leading-tight tracking-normal text-white md:text-5xl">
                            {content.head}
                        </h1>
                        <ArticleAuthorBox author={content.user} viewerUserId={user?.userID} onOpenProfile={openUserProfile} />
                    </header>

                    <div
                        className="p-8 text-justify font-sans text-lg leading-relaxed text-[#ccc] selection:bg-[#e60000] selection:text-white md:p-12 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#e60000] [&_blockquote]:pl-4 [&_br]:block [&_div]:mb-4 [&_h1]:mb-5 [&_h1]:text-3xl [&_h1]:font-black [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-black [&_li]:mb-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#333] [&_pre]:bg-black [&_pre]:p-4 [&_ul]:my-6 [&_ul]:pl-6"
                        dangerouslySetInnerHTML={{ __html: safeBody }}
                    />

                    <ImageGallery images={content.images ?? []} title={content.head} />

                    <footer className="flex flex-col gap-4 border-t border-[#2a2a2a] bg-[#1a1a1a]/50 p-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-4 text-[#777]">
                            <Counter icon={<Eye size={16} />} label="READ" value={stats?.viewCount ?? content.viewCount} />
                            <VoteButton active={stats?.userVote === 'UP'} disabled={busy} icon={<ArrowBigUp size={18} />} value={stats?.upCount ?? content.upCount} onClick={() => void handleVote('UP')} />
                            <VoteButton active={stats?.userVote === 'DOWN'} disabled={busy} icon={<ArrowBigDown size={18} />} value={stats?.downCount ?? content.downCount} onClick={() => void handleVote('DOWN')} />
                            <Counter icon={<MessageSquare size={16} />} label="COMMENTS" value={stats?.commentCount ?? content.commentCount} />
                            <button
                                type="button"
                                onClick={() => void handleBookmark()}
                                className={`flex items-center gap-1 border px-2 py-1 font-mono text-[10px] font-black transition-all ${
                                    bookmarked ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#333] text-[#777] hover:border-[#e60000] hover:text-white'
                                }`}
                            >
                                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                                {bookmarked ? 'SAVED' : 'SAVE'}
                            </button>
                        </div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#444]">
                            End_Of_Transmission
                        </p>
                    </footer>
                    <div ref={readCompletionRef} className="h-2" aria-hidden="true" />
                </main>

                <section className="mt-8 border border-[#2a2a2a] bg-[#151515] p-4 md:p-6">
                    <div className="mb-6 flex flex-col gap-2 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Discussion</p>
                            <h2 className="m-0 mt-1 font-mono text-xl font-black uppercase tracking-widest text-white">Comment Thread</h2>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase text-[#666]">{stats?.commentCount ?? 0} Active Signal</span>
                    </div>

                    <div className="mb-8 flex flex-col gap-3">
                        <textarea
                            id="root-comment"
                            name="commentBody"
                            aria-label="Write a comment"
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
                        {commentsQuery.hasNextPage && (
                            <button
                                type="button"
                                onClick={() => void commentsQuery.fetchNextPage()}
                                disabled={commentsQuery.isFetchingNextPage}
                                className="mx-auto mt-4 block border border-[#333] px-5 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#777] transition-all hover:border-[#e60000] hover:text-[#e60000] disabled:cursor-wait disabled:opacity-50"
                            >
                                {commentsQuery.isFetchingNextPage ? 'Loading...' : 'Load More Comments'}
                            </button>
                        )}
                    </div>
                </section>
                {reportTarget && (
                    <ReportDialog
                        targetLabel={reportTarget.type === 'comment' ? 'komentar' : 'tulisan'}
                        onClose={() => setReportTarget(null)}
                        onSubmit={submitReport}
                    />
                )}
            </div>
        </div>
    );
}

function invalidateContentCacheForMutation(contentId: string) {
    invalidateApiCache(`/content/${contentId}`);
    invalidateApiCache('/content/all-content');
    invalidateApiCache('/content/feed');
    invalidateApiCache('/content/analytics');
}

function mergeCommentPages(pages: CommentPagePayload[]) {
    const known = new Set<string>();
    return pages
        .flatMap((page) => page.items ?? [])
        .filter((comment) => {
            if (known.has(comment.id)) {
                return false;
            }
            known.add(comment.id);
            return true;
        });
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

function ArticleActionRail({
    stats,
    content,
    busy,
    bookmarked,
    onVote,
    onBookmark,
    onReport,
}: {
    stats: ContentStats | null;
    content: ContentItem;
    busy: boolean;
    bookmarked: boolean;
    onVote: (vote: VoteDirection) => Promise<void>;
    onBookmark: () => Promise<void>;
    onReport: () => Promise<void>;
}) {
    return (
        <aside className="fixed bottom-4 left-4 right-4 z-40 flex justify-center md:left-auto md:right-6 md:top-32 md:bottom-auto md:w-14">
            <div className="flex items-center gap-2 border border-[#2a2a2a] bg-[#0b0b0b]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur md:flex-col">
                <RailButton icon={<Eye size={16} />} label="Read count" value={stats?.viewCount ?? content.viewCount} />
                <RailButton active={stats?.userVote === 'UP'} disabled={busy} icon={<ArrowBigUp size={17} />} label="UP" value={stats?.upCount ?? content.upCount} onClick={() => void onVote('UP')} />
                <RailButton active={stats?.userVote === 'DOWN'} disabled={busy} icon={<ArrowBigDown size={17} />} label="DOWN" value={stats?.downCount ?? content.downCount} onClick={() => void onVote('DOWN')} />
                <RailButton icon={<MessageSquare size={15} />} label="Comments" value={stats?.commentCount ?? content.commentCount} />
                <RailButton active={bookmarked} icon={bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} label={bookmarked ? 'Saved' : 'Save'} onClick={() => void onBookmark()} />
                <RailButton icon={<Flag size={15} />} label="Report" danger onClick={() => void onReport()} />
            </div>
        </aside>
    );
}

function RailButton({
    icon,
    label,
    value,
    active = false,
    danger = false,
    disabled = false,
    onClick,
}: {
    icon: ReactNode;
    label: string;
    value?: number;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}) {
    const content = (
        <>
            {icon}
            {value !== undefined && <span className="font-mono text-[9px] font-black">{value}</span>}
        </>
    );

    const className = `flex h-11 min-w-11 items-center justify-center gap-1 border px-2 font-mono text-[9px] font-black uppercase transition-all disabled:cursor-wait md:w-11 md:flex-col md:px-0 ${
        active
            ? 'border-[#e60000] bg-[#e60000] text-white'
            : danger
                ? 'border-[#333] text-[#e60000] hover:border-[#e60000] hover:bg-[#200707]'
                : 'border-[#333] text-[#777] hover:border-[#e60000] hover:text-white'
    }`;

    if (!onClick) {
        return <div className={className} title={label}>{content}</div>;
    }

    return (
        <button type="button" disabled={disabled} onClick={onClick} className={className} title={label}>
            {content}
        </button>
    );
}

function ArticleAuthorBox({
    author,
    viewerUserId,
    onOpenProfile,
}: {
    author?: PublicUser;
    viewerUserId?: string;
    onOpenProfile: (targetUserId?: string) => void;
}) {
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(author?.name || 'Unknown')}`;
    const path = profilePathForUser(author?.userID, viewerUserId);

    return (
        <button
            type="button"
            onClick={() => onOpenProfile(author?.userID)}
            disabled={!path}
            className="flex w-full max-w-xl items-center gap-3 border border-[#2a2a2a] bg-[#101010] p-3 text-left transition-all hover:border-[#e60000] disabled:cursor-default disabled:hover:border-[#2a2a2a]"
        >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden border border-[#333] bg-[#181818]">
                {author?.picture ? (
                    <img
                        src={author.picture}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                    />
                ) : (
                    <UserRound size={18} className="text-[#777]" />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#666]">Author Archive</span>
                <span className="mt-1 block truncate font-mono text-sm font-black uppercase text-white">{author?.name || 'Unknown Officer'}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] uppercase text-[#777]">{author?.username ? `@${author.username}` : author?.designation || 'No designation'}</span>
            </span>
        </button>
    );
}

function ImageGallery({ images, title }: { images: ContentImage[]; title: string }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    if (images.length === 0) {
        return null;
    }
    const selected = images[Math.min(selectedIndex, images.length - 1)];

    return (
        <section className="border-t border-[#2a2a2a] bg-[#101010] p-4 md:p-8">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Visual Evidence</p>
                    <h2 className="m-0 mt-1 font-mono text-sm font-black uppercase tracking-widest text-white">Attached Gallery</h2>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase text-[#666]">{images.length} File</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_150px]">
                <figure className="m-0 overflow-hidden border border-[#333] bg-black">
                    <div className="flex min-h-[260px] items-center justify-center md:min-h-[420px]">
                        <img
                            src={selected.data}
                            alt={selected.alt || `${title} attachment ${selectedIndex + 1}`}
                            width={selected.width ?? 960}
                            height={selected.height ?? 540}
                            loading="lazy"
                            decoding="async"
                            className="max-h-[680px] w-full object-contain"
                        />
                    </div>
                    <figcaption className="flex items-center justify-between gap-3 border-t border-[#222] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#777]">
                        <span className="truncate">{selected.alt || 'Attached visual'}</span>
                        <span className="flex-shrink-0">{selectedIndex + 1}/{images.length}</span>
                    </figcaption>
                </figure>

                {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
                        {images.map((image, index) => (
                            <button
                                key={image.id || `${title}-${index}`}
                                type="button"
                                onClick={() => setSelectedIndex(index)}
                                className={`relative aspect-square overflow-hidden border bg-black transition-all ${
                                    index === selectedIndex ? 'border-[#e60000]' : 'border-[#333] opacity-70 hover:border-white hover:opacity-100'
                                }`}
                                title={image.alt || `Image ${index + 1}`}
                            >
                                <img
                                    src={image.thumbnail || image.data}
                                    alt=""
                                    width={image.width ?? 150}
                                    height={image.height ?? 150}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover"
                                />
                                <span className="absolute bottom-1 right-1 bg-black/80 px-1 font-mono text-[8px] font-black text-white">{index + 1}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
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
    const feedback = useFeedback();
    const navigate = useNavigate();
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [replyPosting, setReplyPosting] = useState(false);
    const canDelete = Boolean(user && !comment.deleted && (user.role === 'ADMIN' || user.userID === comment.user?.userID));
    const depthTone = depth === 0 ? '#e60000' : depth === 1 ? '#8b5cf6' : depth === 2 ? '#38bdf8' : '#555';

    const openCommentAuthor = () => {
        const path = profilePathForUser(comment.user?.userID, user?.userID);
        if (path) {
            navigate(path);
        }
    };

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
        <div className="relative pl-3 sm:pl-4" style={{ marginLeft: depth > 0 ? Math.min(depth, 4) * 10 : 0 }}>
            <div className="absolute bottom-0 left-0 top-0 w-px" style={{ backgroundColor: depthTone }} />
            <div className={`border p-4 ${comment.adminHighlighted ? 'border-[#e60000] bg-[#190707]' : 'border-[#242424] bg-[#101010]'}`}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <button
                        type="button"
                        onClick={openCommentAuthor}
                        disabled={!comment.user?.userID}
                        className="flex min-w-0 items-center gap-3 text-left transition-all hover:text-[#e60000] disabled:cursor-default"
                    >
                        <span className="h-9 w-9 flex-shrink-0 overflow-hidden border border-[#333] bg-[#222] transition-all hover:border-[#e60000]">
                            {comment.user?.picture ? (
                                <img src={comment.user.picture} alt="" width={36} height={36} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-[#777]"><UserRound size={15} /></span>
                            )}
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate font-mono text-[11px] font-black uppercase text-white">{comment.user?.name || 'UNKNOWN'} {comment.user?.username ? <span className="text-[#666]">@{comment.user.username}</span> : null}</span>
                            <span className="block font-mono text-[9px] uppercase text-[#555]">{formatCommentDate(comment.createdAt)}</span>
                        </span>
                    </button>
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
                <p className={`m-0 whitespace-pre-wrap border-t border-[#1f1f1f] pt-3 font-sans text-sm leading-7 ${comment.deleted ? 'text-[#555]' : 'text-[#d1d5db]'}`}>
                    {comment.body}
                </p>
                {!comment.deleted && (
                    <button
                        type="button"
                        onClick={() => user ? setReplyOpen(!replyOpen) : feedback.toast('Guest hanya bisa membaca. Login dulu untuk membalas komentar.', 'info')}
                        className="mt-4 font-mono text-[10px] font-black uppercase text-[#e60000] hover:text-white"
                    >
                        Reply
                    </button>
                )}
                {replyOpen && (
                    <div className="mt-3 flex flex-col gap-2">
                        <textarea
                            id={`reply-comment-${comment.id}`}
                            name={`replyComment-${comment.id}`}
                            aria-label="Write reply"
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

const reportCategories = [
    { value: 'SPAM', label: 'Spam' },
    { value: 'HARASSMENT', label: 'Pelecehan' },
    { value: 'SPOILER', label: 'Spoiler Berat' },
    { value: 'MISINFORMATION', label: 'Info Menyesatkan' },
    { value: 'ILLEGAL', label: 'Konten Terlarang' },
    { value: 'OTHER', label: 'Lainnya' },
];

function ReportDialog({
    targetLabel,
    onClose,
    onSubmit,
}: {
    targetLabel: string;
    onClose: () => void;
    onSubmit: (category: string, reason: string) => Promise<void>;
}) {
    const [category, setCategory] = useState(reportCategories[0].value);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        if (!reason.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit(category, reason.trim());
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg border border-[#2a2a2a] bg-[#0d0d0d] p-6 shadow-2xl">
                <div className="mb-5 border-l-4 border-[#e60000] pl-4">
                    <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Report System</p>
                    <h2 className="m-0 mt-2 font-mono text-xl font-black uppercase text-white">Laporkan {targetLabel}</h2>
                </div>
                <div className="space-y-4">
                    <select
                        id="report-category"
                        name="reportCategory"
                        aria-label="Report category"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs uppercase text-white outline-none focus:border-[#e60000]"
                    >
                        {reportCategories.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <textarea
                        id="report-reason"
                        name="reportReason"
                        aria-label="Report reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={500}
                        className="min-h-32 w-full resize-y border border-[#333] bg-[#101010] p-3 font-sans text-sm leading-6 text-white outline-none focus:border-[#e60000]"
                        placeholder="Tulis alasan yang spesifik agar admin/moderator bisa menilai dengan cepat..."
                    />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={submitting} className="border border-[#333] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white">Cancel</button>
                    <button type="button" onClick={() => void submit()} disabled={submitting || !reason.trim()} className="border border-[#e60000] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                        {submitting ? 'Sending' : 'Send Report'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatCommentDate(dateString?: string) {
    if (!dateString) return 'NO DATE';
    return formatIndonesiaShortTime(dateString);
}

function formatArticleDate(dateString?: string) {
    if (!dateString) return 'NO DATE';
    return formatIndonesiaDate(dateString);
}
