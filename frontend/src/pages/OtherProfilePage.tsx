import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Ban, Eye, Flag, ShieldAlert, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import api, { cachedGet, invalidateApiCache, isRequestCanceled } from '../lib/api';
import logo from '../assets/S.T.A.R.S._logo.webp';
import { getCategoryColor } from '../utils/categoryColors';
import { stripHtml } from '../utils/sanitize';
import type { BadgeCode, ContentItem, CurrentUser, PublicUser } from '../types/forum';
import BadgeStrip from '../components/BadgeStrip';
import { useFeedback } from '../components/feedback';
import ProfileCardRenderer from '../components/ProfileCardRenderer';
import { LazyRenderList } from '../components/LazyRender';

const assignableBadges: BadgeCode[] = ['MODERATOR', 'WRITERS', 'MEDIA_TEC', 'CRIMINAL', 'SPEED', 'SMILE', 'REQUIEM'];

type ProfileActionDialog = 'report' | 'suspend' | 'delete' | 'badge';

export default function OtherProfilePage({ user }: { user: CurrentUser | null }) {
    const feedback = useFeedback();
    const { userId } = useParams();
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [viewedUser, setViewedUser] = useState<PublicUser | null>(null);
    const [followers, setFollowers] = useState<PublicUser[]>([]);
    const [following, setFollowing] = useState<PublicUser[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [dialog, setDialog] = useState<ProfileActionDialog | null>(null);
    const [reportMessage, setReportMessage] = useState('');
    const [selectedBadge, setSelectedBadge] = useState<BadgeCode>('WRITERS');
    const [badgeMode, setBadgeMode] = useState<'grant' | 'revoke'>('grant');
    const [actionBusy, setActionBusy] = useState(false);
    const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const navigate = useNavigate();
    const isMyOwnProfile = String(user?.userID) === String(userId);

    const fetchProfileData = useCallback(async (targetUserId: string, force = false, signal?: AbortSignal) => {
        const [profileRes, contentRes, followersRes, followingRes] = await Promise.all([
            cachedGet<PublicUser>(`/api/user/${targetUserId}`, { signal }, {
                ttlMs: 2 * 60_000,
                force,
            }),
            cachedGet<ContentItem[]>(`/content/by-user/${targetUserId}`, { signal }, {
                ttlMs: 60_000,
                scope: user?.userID ?? 'guest',
                force,
            }),
            cachedGet<PublicUser[]>(`/api/user/${targetUserId}/followers`, { signal }, {
                ttlMs: 60_000,
                scope: user?.userID ?? 'guest',
                force,
            }),
            cachedGet<PublicUser[]>(`/api/user/${targetUserId}/following`, { signal }, {
                ttlMs: 60_000,
                scope: user?.userID ?? 'guest',
                force,
            }),
        ]);
        setViewedUser(profileRes);
        setContents(Array.isArray(contentRes) ? contentRes : []);
        setFollowers(Array.isArray(followersRes) ? followersRes : []);
        setFollowing(Array.isArray(followingRes) ? followingRes : []);
    }, [user?.userID]);

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        void fetchProfileData(userId, false, controller.signal).catch((error) => {
            if (!isRequestCanceled(error)) {
                setViewedUser(null);
                setContents([]);
                setFollowers([]);
                setFollowing([]);
            }
        });
        return () => controller.abort();
    }, [fetchProfileData, userId]);

    const displayUser = isMyOwnProfile && user ? user : viewedUser;
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(displayUser?.name || 'User')}`;
    const activeProfileCard = displayUser?.activeProfileCard;
    const showCustomProfileCard = Boolean(activeProfileCard?.custom && activeProfileCard.backgroundImage);
    const canModerate = Boolean(user?.badges?.some((badge) => badge.code === 'MODERATOR' || badge.code === 'ADMIN'));
    const isAdminViewer = user?.role === 'ADMIN';
    const isSelfTarget = displayUser?.userID === user?.userID;
    const targetIsAdmin = Boolean(displayUser?.badges?.some((badge) => badge.code === 'ADMIN'));
    const contextMenuStyle = useMemo(() => {
        if (!contextMenu) return undefined;
        const left = Math.max(12, Math.min(contextMenu.x, window.innerWidth - 292));
        const top = Math.max(12, Math.min(contextMenu.y, window.innerHeight - 292));
        return { left, top };
    }, [contextMenu]);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        const closeByEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu(null);
                setDialog(null);
            }
        };

        window.addEventListener('click', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('keydown', closeByEscape);

        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
            window.removeEventListener('keydown', closeByEscape);
        };
    }, []);

    useEffect(() => {
        setIsFollowing(Boolean(displayUser?.userID && user?.followingUserIds?.includes(displayUser.userID)));
    }, [displayUser?.userID, user?.followingUserIds]);

    const openActionDialog = (nextDialog: ProfileActionDialog) => {
        setContextMenu(null);
        setActionNotice(null);
        if (nextDialog === 'report') {
            setReportMessage('');
        }
        setDialog(nextDialog);
    };

    const closeActionDialog = () => {
        if (actionBusy) return;
        setDialog(null);
        setReportMessage('');
    };

    const suspendTarget = async () => {
        if (!displayUser || isSelfTarget || targetIsAdmin) return;
        setActionBusy(true);
        setActionNotice(null);
        try {
            if (isAdminViewer) {
                await api.post(`/api/admin/users/${displayUser.userID}/suspend`, { hours: 24 });
            } else {
                await api.post(`/api/moderation/users/${displayUser.userID}/suspend`);
            }
            invalidateApiCache(`/api/user/${displayUser.userID}`);
            await fetchProfileData(displayUser.userID, true);
            setDialog(null);
            setActionNotice({
                type: 'success',
                message: isAdminViewer ? 'User disuspend selama 24 jam.' : 'User disuspend selama 1 jam.',
            });
        } catch (error) {
            setActionNotice({ type: 'error', message: getActionError(error) });
        } finally {
            setActionBusy(false);
        }
    };

    const deleteTarget = async () => {
        if (!displayUser || !isAdminViewer || isSelfTarget) return;
        setActionBusy(true);
        setActionNotice(null);
        try {
            await api.delete(`/api/admin/users/${displayUser.userID}`);
            invalidateApiCache(`/api/user/${displayUser.userID}`);
            invalidateApiCache(`/content/by-user/${displayUser.userID}`);
            navigate('/');
        } catch (error) {
            setActionNotice({ type: 'error', message: getActionError(error) });
        } finally {
            setActionBusy(false);
        }
    };

    const updateTargetBadge = async () => {
        if (!displayUser || !isAdminViewer) return;
        setActionBusy(true);
        setActionNotice(null);
        try {
            if (badgeMode === 'grant') {
                await api.post(`/api/admin/users/${displayUser.userID}/badges/${selectedBadge}`);
            } else {
                await api.delete(`/api/admin/users/${displayUser.userID}/badges/${selectedBadge}`);
            }
            invalidateApiCache(`/api/user/${displayUser.userID}`);
            await fetchProfileData(displayUser.userID, true);
            setDialog(null);
            setActionNotice({
                type: 'success',
                message: badgeMode === 'grant' ? `Badge ${selectedBadge} diberikan.` : `Badge ${selectedBadge} dicabut.`,
            });
        } catch (error) {
            setActionNotice({ type: 'error', message: getActionError(error) });
        } finally {
            setActionBusy(false);
        }
    };

    const reportTargetAdmin = async () => {
        if (!displayUser || !reportMessage.trim()) return;
        setActionBusy(true);
        setActionNotice(null);
        try {
            await api.post(`/api/moderation/admins/${displayUser.userID}/report`, {
                title: 'Laporan moderator',
                message: reportMessage.trim(),
            });
            setDialog(null);
            setReportMessage('');
            setActionNotice({ type: 'success', message: 'Laporan terkirim ke log dan notifikasi admin.' });
        } catch (error) {
            setActionNotice({ type: 'error', message: getActionError(error) });
        } finally {
            setActionBusy(false);
        }
    };

    const toggleFollow = async () => {
        if (!displayUser || !user || isSelfTarget) return;
        setActionBusy(true);
        try {
            if (isFollowing) {
                await api.delete(`/api/user/following/${displayUser.userID}`);
                setIsFollowing(false);
                feedback.toast(`Berhenti mengikuti ${displayUser.name}.`, 'success');
            } else {
                await api.post(`/api/user/following/${displayUser.userID}`);
                setIsFollowing(true);
                feedback.toast(`Mengikuti ${displayUser.name}.`, 'success');
            }
            invalidateApiCache('/api/user/following');
            invalidateApiCache('/api/user/me');
        } catch (error) {
            feedback.toast(getActionError(error), 'error');
        } finally {
            setActionBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#111] p-6 font-mono text-[#eee] lg:p-10">
            <div className="mx-auto max-w-[1600px]">
                <div className="mb-10 flex items-center justify-between border-b border-[#2a2a2a] pb-4">
                    <button type="button" onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#888] transition-all hover:text-[#e60000]">
                        <span className="text-xs font-bold uppercase tracking-widest">{'<'} Back to Command Center</span>
                    </button>
                    <div className="text-[10px] uppercase tracking-normal text-[#444]">
                        Mode: <span className={isMyOwnProfile ? 'text-green-500' : 'text-yellow-500'}>
                            {isMyOwnProfile ? 'SELF_ACCESS' : 'GUEST_RESTRICTED'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-start gap-10 lg:flex-row">
                    <div className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-[380px]">
                        <div
                            className="w-full"
                            onContextMenu={(event) => {
                                if (!canModerate || !displayUser) return;
                                event.preventDefault();
                                setActionNotice(null);
                                setContextMenu({ x: event.clientX, y: event.clientY });
                            }}
                            title={canModerate ? 'Klik kanan untuk action moderator/admin' : undefined}
                        >
                            {showCustomProfileCard ? (
                                <ProfileCardRenderer user={displayUser as PublicUser} card={activeProfileCard} />
                            ) : (
                                <DefaultPublicProfileCard displayUser={displayUser} defaultAvatar={defaultAvatar} />
                            )}
                        </div>
                        <div className="mt-3">
                            <BadgeStrip badges={displayUser?.badges} />
                        </div>

                        {user && displayUser && !isSelfTarget && (
                            <button
                                type="button"
                                onClick={() => void toggleFollow()}
                                disabled={actionBusy}
                                className={`mt-4 flex h-10 items-center gap-2 border px-4 font-mono text-[10px] font-black uppercase tracking-widest transition-all disabled:cursor-wait disabled:opacity-50 ${
                                    isFollowing
                                        ? 'border-[#333] text-[#777] hover:border-[#e60000] hover:text-[#e60000]'
                                        : 'border-[#e60000] text-[#e60000] hover:bg-[#e60000] hover:text-white'
                                }`}
                            >
                                {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                        )}

                        {displayUser && (
                            <div className="mt-5 grid gap-3 border border-[#2a2a2a] bg-[#151515] p-4">
                                <ProfileRelationPreview
                                    title="Followers"
                                    users={followers}
                                    onOpen={(target) => navigate(`/profile/${target.userID}`)}
                                />
                                <ProfileRelationPreview
                                    title="Following"
                                    users={following}
                                    onOpen={(target) => navigate(`/profile/${target.userID}`)}
                                />
                            </div>
                        )}

                        {actionNotice && (
                            <div className={`mt-4 border p-3 font-mono text-[10px] font-black uppercase tracking-widest ${
                                actionNotice.type === 'success'
                                    ? 'border-[#166534] bg-[#071407] text-[#4ade80]'
                                    : 'border-[#7f1d1d] bg-[#1a0707] text-[#ff5555]'
                            }`}>
                                {actionNotice.message}
                            </div>
                        )}

                        {displayUser?.suspensionMarked && (
                            <div className="mt-4 border border-[#e60000] bg-[#1a0b0b] p-4">
                                <div className="mb-2 flex items-center gap-2 text-[#e60000]">
                                    <ShieldAlert size={16} />
                                    <span className="font-mono text-[10px] font-black uppercase tracking-widest">Suspension Mark Placeholder</span>
                                </div>
                                <div className="h-24 border border-dashed border-[#e60000]/40 bg-[#100]" />
                            </div>
                        )}
                    </div>

                    <div className="w-full flex-1">
                        <div className="mb-10 border-b border-[#2a2a2a] pb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest">{isMyOwnProfile ? 'Personal Archives' : 'Remote Sector Data'}</h2>
                            <p className="font-mono text-xs text-[#888]">Viewing {contents.length} remote entries for subject: {userId?.substring(0, 8)}...</p>
                        </div>

                        <div className="grid gap-6">
                            <LazyRenderList
                                items={contents}
                                getKey={(item) => item.idContent}
                                estimateSize={170}
                                className="grid gap-6"
                                renderItem={(item) => <RemoteArchiveItem item={item} onOpen={() => navigate(`/read/${item.idContent}`)} />}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {contextMenu && displayUser && (
                <div
                    className="fixed z-50 w-[280px] border border-[#333] bg-[#101010] p-2 font-mono shadow-2xl shadow-black/60"
                    style={contextMenuStyle}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="mb-2 border-b border-[#2a2a2a] px-2 pb-2">
                        <p className="m-0 text-[9px] font-black uppercase tracking-[0.3em] text-[#e60000]">Profile Actions</p>
                        <p className="m-0 mt-1 truncate text-xs font-black uppercase text-white">{displayUser.name}</p>
                    </div>
                    <ContextMenuItem
                        icon={<Eye size={14} />}
                        label="Lihat"
                        hint="Tetap buka profile ini"
                        onSelect={() => {
                            setContextMenu(null);
                            navigate(`/profile/${displayUser.userID}`);
                        }}
                    />
                    {isAdminViewer ? (
                        <>
                            <ContextMenuItem
                                icon={<Ban size={14} />}
                                label="Suspend"
                                hint={targetIsAdmin ? 'Admin tidak bisa disuspend' : '24 jam dari admin'}
                                disabled={isSelfTarget || targetIsAdmin}
                                tone="danger"
                                onSelect={() => openActionDialog('suspend')}
                            />
                            <ContextMenuItem
                                icon={<BadgeCheck size={14} />}
                                label="Badges"
                                hint="Beri atau cabut badge"
                                onSelect={() => openActionDialog('badge')}
                            />
                            <ContextMenuItem
                                icon={<Trash2 size={14} />}
                                label="Hapus"
                                hint={isSelfTarget ? 'Tidak bisa hapus akun sendiri' : 'Hapus akun target'}
                                disabled={isSelfTarget}
                                tone="danger"
                                onSelect={() => openActionDialog('delete')}
                            />
                        </>
                    ) : targetIsAdmin ? (
                        <ContextMenuItem
                            icon={<Flag size={14} />}
                            label="Laporkan admin"
                            hint="Kirim laporan ke log admin"
                            onSelect={() => openActionDialog('report')}
                        />
                    ) : (
                        <ContextMenuItem
                            icon={<Ban size={14} />}
                            label="Suspend"
                            hint={isSelfTarget ? 'Tidak bisa suspend diri sendiri' : '1 jam dari moderator'}
                            disabled={isSelfTarget}
                            tone="danger"
                            onSelect={() => openActionDialog('suspend')}
                        />
                    )}
                </div>
            )}

            {dialog && displayUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
                    <div className="w-full max-w-xl border border-[#333] bg-[#111] p-5 font-mono shadow-2xl shadow-black/70">
                        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#2a2a2a] pb-4">
                            <div>
                                <p className="m-0 text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">{getDialogEyebrow(dialog)}</p>
                                <h2 className="m-0 mt-2 text-xl font-black uppercase tracking-widest text-white">{getDialogTitle(dialog)}</h2>
                        <p className="m-0 mt-1 text-[10px] uppercase text-[#777]">Target: {displayUser.name} {displayUser.username ? `// @${displayUser.username}` : ''}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeActionDialog}
                                disabled={actionBusy}
                                className="flex h-9 w-9 items-center justify-center border border-[#333] text-[#777] hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Close action popup"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {dialog === 'report' && (
                            <div className="space-y-4">
                                <p className="m-0 text-xs leading-relaxed text-[#aaa]">
                                    Laporan moderator akan masuk ke log admin dan bisa dibaca sebagai pesan detail.
                                </p>
                                <textarea
                                    id="moderator-report-message"
                                    name="moderatorReportMessage"
                                    aria-label="Moderator report message"
                                    value={reportMessage}
                                    onChange={(event) => setReportMessage(event.target.value)}
                                    rows={5}
                                    className="w-full resize-none border border-[#333] bg-[#090909] p-3 text-sm text-white outline-none focus:border-[#e60000]"
                                    placeholder="Tulis alasan laporan..."
                                />
                                <DialogActions
                                    busy={actionBusy}
                                    confirmLabel="Kirim Laporan"
                                    confirmDisabled={!reportMessage.trim()}
                                    onCancel={closeActionDialog}
                                    onConfirm={() => void reportTargetAdmin()}
                                />
                            </div>
                        )}

                        {dialog === 'suspend' && (
                            <div className="space-y-4">
                                <div className="border border-[#3a1a1a] bg-[#160707] p-4 text-sm text-[#ddd]">
                                    Aksi ini akan menahan akses tulis target selama <span className="font-black text-[#e60000]">{isAdminViewer ? '24 jam' : '1 jam'}</span>.
                                    {isAdminViewer && <span> Admin suspend juga akan memberi mark Criminal sesuai aturan sistem.</span>}
                                </div>
                                <DialogActions
                                    busy={actionBusy}
                                    confirmLabel="Suspend"
                                    danger
                                    onCancel={closeActionDialog}
                                    onConfirm={() => void suspendTarget()}
                                />
                            </div>
                        )}

                        {dialog === 'delete' && (
                            <div className="space-y-4">
                                <div className="border border-[#3a1a1a] bg-[#160707] p-4 text-sm text-[#ddd]">
                                    Akun <span className="font-black text-white">{displayUser.name}</span> akan dihapus dari database. Aksi ini tidak memakai dialog browser lagi, jadi konfirmasi ada di sini.
                                </div>
                                <DialogActions
                                    busy={actionBusy}
                                    confirmLabel="Hapus Akun"
                                    danger
                                    onCancel={closeActionDialog}
                                    onConfirm={() => void deleteTarget()}
                                />
                            </div>
                        )}

                        {dialog === 'badge' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[#777]" htmlFor="profile-badge-select">
                                        Badge
                                    </label>
                                    <select
                                        id="profile-badge-select"
                                        name="profileBadgeSelect"
                                        aria-label="Profile badge selection"
                                        value={selectedBadge}
                                        onChange={(event) => setSelectedBadge(event.target.value as BadgeCode)}
                                        className="h-11 w-full border border-[#333] bg-[#090909] px-3 text-sm font-black text-white outline-none focus:border-[#e60000]"
                                    >
                                        {assignableBadges.map((badge) => (
                                            <option key={badge} value={badge}>{badge}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 border border-[#333]">
                                    <button
                                        type="button"
                                        onClick={() => setBadgeMode('grant')}
                                        className={`h-11 text-[10px] font-black uppercase tracking-widest ${badgeMode === 'grant' ? 'bg-[#166534] text-white' : 'text-[#777] hover:text-white'}`}
                                    >
                                        Beri
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBadgeMode('revoke')}
                                        className={`h-11 border-l border-[#333] text-[10px] font-black uppercase tracking-widest ${badgeMode === 'revoke' ? 'bg-[#7f1d1d] text-white' : 'text-[#777] hover:text-white'}`}
                                    >
                                        Cabut
                                    </button>
                                </div>
                                <DialogActions
                                    busy={actionBusy}
                                    confirmLabel={badgeMode === 'grant' ? 'Beri Badge' : 'Cabut Badge'}
                                    danger={badgeMode === 'revoke'}
                                    onCancel={closeActionDialog}
                                    onConfirm={() => void updateTargetBadge()}
                                />
                            </div>
                        )}

                        {actionNotice?.type === 'error' && (
                            <div className="mt-4 border border-[#7f1d1d] bg-[#1a0707] p-3 text-[10px] font-black uppercase tracking-widest text-[#ff5555]">
                                {actionNotice.message}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function RemoteArchiveItem({ item, onOpen }: { item: ContentItem; onOpen: () => void }) {
    const color = getCategoryColor(item.kategori);
    return (
        <div onClick={onOpen} className="group cursor-pointer border border-[#2a2a2a] bg-[#181818] p-6 transition-all hover:border-[#e60000]">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-4">
                        <span className="text-[10px] font-bold text-[#e60000]">ENTRY ID: {item.idContent?.substring(0, 8)}...</span>
                        <span className="border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ borderColor: color, color, backgroundColor: `${color}15` }}>{item.kategori}</span>
                    </div>
                    <h3 className="mb-2 text-xl font-black uppercase text-white group-hover:text-[#e60000]">{item.head}</h3>
                    <p className="line-clamp-2 text-sm text-[#bbb] opacity-90">{stripHtml(item.paragrafs).substring(0, 180)}...</p>
                </div>
            </div>
        </div>
    );
}

function DefaultPublicProfileCard({ displayUser, defaultAvatar }: { displayUser: PublicUser | CurrentUser | null; defaultAvatar: string }) {
    return (
        <div className="relative flex min-h-[280px] w-full overflow-hidden rounded-xl border border-[#2a2a2a] bg-white shadow-2xl">
            <div className="flex w-[40%] flex-col items-center justify-center border-r-[3px] border-white bg-[#1a3a63] p-4 text-center">
                <img src={logo} alt="STARS" width={180} height={180} className="mb-2 w-[80%]" />
                <h2 className="text-[10px] font-black uppercase leading-tight text-white">SPECIAL TACTICS AND RESCUE SERVICE</h2>
            </div>

            <div className="relative flex flex-1 flex-col justify-between bg-white p-5 text-[#1a3a63]">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black leading-none">POLICE</h1>
                        <p className="text-[10px] font-bold">CENTRAL ARCHIVE DEP.</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center border border-[#1a3a63] text-xs font-black italic">RPD</div>
                </div>

                <div className="space-y-4">
                    <ProfileField label="Officer Name" value={displayUser?.name || 'N/A'} />
                    <ProfileField label={displayUser?.username ? 'Username' : 'Designation'} value={displayUser?.username ? `@${displayUser.username}` : displayUser?.designation || 'ACCESS_RESTRICTED'} />
                </div>

                <div className="flex items-end justify-between gap-3">
                    <div className="h-24 w-20 flex-shrink-0 border border-[#1a3a63] bg-gray-200 p-0.5">
                        <img
                            src={displayUser?.picture || defaultAvatar}
                            alt="Photo"
                            width={80}
                            height={96}
                            className="h-full w-full object-cover grayscale contrast-125"
                            onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <div className="flex flex-1 flex-col items-end">
                        <div className="w-full max-w-[100px] text-center">
                            <div className="mb-0.5 truncate border-b border-[#1a3a63] pb-0.5 font-serif text-sm italic leading-none">GEBXBY</div>
                            <span className="text-[7px] font-black uppercase">Authorized Signature</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ label, value }: { label: string; value: string }) {
    return (
        <div className="relative border-b border-[#1a3a63] pb-0.5">
            <span className="block truncate text-sm font-black uppercase">{value}</span>
            <span className="absolute -bottom-3 right-0 text-[6px] font-bold uppercase opacity-60">{label}</span>
        </div>
    );
}

function ProfileRelationPreview({
    title,
    users,
    onOpen,
}: {
    title: string;
    users: PublicUser[];
    onOpen: (user: PublicUser) => void;
}) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <p className="m-0 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">{title}</p>
                <span className="font-mono text-[10px] font-black text-[#e60000]">{users.length}</span>
            </div>
            {users.length === 0 ? (
                <p className="m-0 font-mono text-[9px] uppercase tracking-[0.25em] text-[#444]">[ empty ]</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {users.slice(0, 8).map((target) => {
                        const avatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(target.name || 'User')}`;
                        return (
                            <button
                                key={target.userID}
                                type="button"
                                onClick={() => onOpen(target)}
                                title={target.username ? `@${target.username}` : target.name}
                                className="h-8 w-8 overflow-hidden border border-[#333] bg-[#111] hover:border-[#e60000]"
                            >
                                <img
                                    src={target.picture || avatar}
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(event) => { event.currentTarget.src = avatar; }}
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ContextMenuItem({
    icon,
    label,
    hint,
    disabled = false,
    tone = 'normal',
    onSelect,
}: {
    icon: ReactNode;
    label: string;
    hint: string;
    disabled?: boolean;
    tone?: 'normal' | 'danger';
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className={`flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                tone === 'danger'
                    ? 'text-[#bbb] hover:bg-[#240808] hover:text-[#ff5555]'
                    : 'text-[#bbb] hover:bg-[#181818] hover:text-white'
            }`}
        >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[#333]">{icon}</span>
            <span className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-widest">{label}</span>
                <span className="block truncate text-[9px] uppercase text-[#666]">{hint}</span>
            </span>
        </button>
    );
}

function DialogActions({
    busy,
    confirmLabel,
    confirmDisabled = false,
    danger = false,
    onCancel,
    onConfirm,
}: {
    busy: boolean;
    confirmLabel: string;
    confirmDisabled?: boolean;
    danger?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="flex flex-col-reverse gap-3 border-t border-[#2a2a2a] pt-4 sm:flex-row sm:justify-end">
            <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="h-10 border border-[#333] px-4 text-[10px] font-black uppercase tracking-widest text-[#888] hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={onConfirm}
                disabled={busy || confirmDisabled}
                className={`h-10 border px-4 text-[10px] font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40 ${
                    danger
                        ? 'border-[#e60000] text-[#e60000] hover:bg-[#e60000] hover:text-white'
                        : 'border-[#166534] text-[#4ade80] hover:bg-[#166534] hover:text-white'
                }`}
            >
                {busy ? 'Processing...' : confirmLabel}
            </button>
        </div>
    );
}

function getDialogEyebrow(dialog: ProfileActionDialog) {
    if (dialog === 'report') return 'Moderator Report';
    if (dialog === 'suspend') return 'Access Control';
    if (dialog === 'delete') return 'Permanent Action';
    return 'Badge Registry';
}

function getDialogTitle(dialog: ProfileActionDialog) {
    if (dialog === 'report') return 'Kirim Laporan';
    if (dialog === 'suspend') return 'Konfirmasi Suspend';
    if (dialog === 'delete') return 'Konfirmasi Hapus';
    return 'Kelola Badge';
}

function getActionError(error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        const data = response?.data;
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
    return 'Aksi gagal diproses. Coba lagi.';
}
