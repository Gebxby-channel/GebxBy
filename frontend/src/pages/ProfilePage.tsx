import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bookmark, FileText, ShieldAlert, Users, Settings, UserCheck } from 'lucide-react';
import api, { cachedGet, invalidateApiCache, isRequestCanceled } from '../lib/api';
import logo from '../assets/S.T.A.R.S._logo.webp';
import { getCategoryColor } from '../utils/categoryColors';
import { profilePathForUser } from '../utils/profilePath';
import { stripHtml } from '../utils/sanitize';
import type { Badge, ContentItem, CurrentUser, ProfileCardItem, PublicUser } from '../types/forum';
import BadgeStrip from '../components/BadgeStrip';
import { useFeedback } from '../components/feedback';
import { formatIndonesiaDate } from '../utils/time';
import ProfileCardRenderer from '../components/ProfileCardRenderer';
import { Modal, Button as UiButton } from '../components/ui';
import { LazyRenderList } from '../components/LazyRender';

export default function ProfilePage({ user, setUser }: { user: CurrentUser; setUser: (user: CurrentUser) => void }) {
    const feedback = useFeedback();
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [bookmarks, setBookmarks] = useState<ContentItem[]>([]);
    const [following, setFollowing] = useState<PublicUser[]>([]);
    const [followers, setFollowers] = useState<PublicUser[]>([]);
    const [profileTab, setProfileTab] = useState<'about' | 'writings' | 'bookmarks' | 'following' | 'followers' | 'badges' | 'settings'>('about');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [name, setName] = useState(user.name || '');
    const [designation, setDesignation] = useState(user.designation || 'RECONNAISSANCE OFFICER');
    const [picture, setPicture] = useState(user.picture || '');
    const [profileCardId, setProfileCardId] = useState(user.activeProfileCard?.id || 'DEFAULT:STARS');
    const [cardDisplayName, setCardDisplayName] = useState(user.activeProfileCard?.displayName || '');
    const [cardDisplayPhoto, setCardDisplayPhoto] = useState(user.activeProfileCard?.displayPhoto || '');
    const [cropSource, setCropSource] = useState('');
    const [cropZoom, setCropZoom] = useState(1);
    const [cropX, setCropX] = useState(0);
    const [cropY, setCropY] = useState(0);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileEditorOpen, setProfileEditorOpen] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
    const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);

    const navigate = useNavigate();
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(user.name || 'User')}`;
    const publishedContents = contents.filter(item => item.status !== 'DRAFT');
    const draftContents = contents.filter(item => item.status === 'DRAFT');
    const profileStats = {
        writings: publishedContents.length,
        drafts: draftContents.length,
        up: contents.reduce((sum, item) => sum + (item.upCount || 0), 0),
        comments: contents.reduce((sum, item) => sum + (item.commentCount || 0), 0),
        views: contents.reduce((sum, item) => sum + (item.viewCount || 0), 0),
    };
    const availableProfileCards = user.profileCards?.length ? user.profileCards : [
        { id: 'DEFAULT:STARS', code: 'DEFAULT:STARS', name: 'S.T.A.R.S. Archive Card', orientation: 'HORIZONTAL', layout: defaultCardLayout(), custom: false, template: false },
    ];
    const selectedProfileCard = availableProfileCards.find(card => card.id === profileCardId || card.code === profileCardId) ?? user.activeProfileCard;
    const canCustomizeSelectedCard = isGiftedProfileCard(selectedProfileCard);
    const cardDirty = canCustomizeSelectedCard && (
        cardDisplayName !== (selectedProfileCard?.displayName || '')
        || cardDisplayPhoto !== (selectedProfileCard?.displayPhoto || '')
    );
    const profileDirty = name !== (user.name || '')
        || designation !== (user.designation || 'RECONNAISSANCE OFFICER')
        || picture !== (user.picture || '')
        || profileCardId !== (user.activeProfileCard?.id || 'DEFAULT:STARS')
        || cardDirty;
    const previewUser: CurrentUser = { ...user, name, designation, picture };
    const previewProfileCard = selectedProfileCard
        ? { ...selectedProfileCard, displayName: canCustomizeSelectedCard ? cardDisplayName : selectedProfileCard.displayName, displayPhoto: canCustomizeSelectedCard ? cardDisplayPhoto : selectedProfileCard.displayPhoto }
        : undefined;

    const fetchMyContents = useCallback(async (force = false, signal?: AbortSignal) => {
        const data = await cachedGet<ContentItem[]>(`/content/by-user/${user.userID}`, { signal }, {
            ttlMs: 60_000,
            scope: user.userID,
            force,
        });
        const myData = (Array.isArray(data) ? data : [])
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });
        setContents(myData);
    }, [sortOrder, user.userID]);

    const fetchBookmarks = useCallback(async (force = false, signal?: AbortSignal) => {
        const data = await cachedGet<ContentItem[]>('/api/user/bookmarks', { signal }, {
            ttlMs: 30_000,
            scope: user.userID,
            force,
        });
        setBookmarks(Array.isArray(data) ? data : []);
    }, [user.userID]);

    const fetchFollowing = useCallback(async (force = false, signal?: AbortSignal) => {
        const data = await cachedGet<PublicUser[]>('/api/user/following', { signal }, {
            ttlMs: 30_000,
            scope: user.userID,
            force,
        });
        setFollowing(Array.isArray(data) ? data : []);
    }, [user.userID]);

    const fetchFollowers = useCallback(async (force = false, signal?: AbortSignal) => {
        const data = await cachedGet<PublicUser[]>('/api/user/followers', { signal }, {
            ttlMs: 30_000,
            scope: user.userID,
            force,
        });
        setFollowers(Array.isArray(data) ? data : []);
    }, [user.userID]);

    useEffect(() => {
        const controller = new AbortController();
        void Promise.all([
            fetchMyContents(false, controller.signal),
            fetchBookmarks(false, controller.signal),
            fetchFollowing(false, controller.signal),
            fetchFollowers(false, controller.signal),
        ]).catch((error) => {
            if (!isRequestCanceled(error)) {
                setContents([]);
                setBookmarks([]);
                setFollowing([]);
                setFollowers([]);
            }
        });
        return () => controller.abort();
    }, [fetchBookmarks, fetchFollowers, fetchFollowing, fetchMyContents]);

    useEffect(() => {
        setName(user.name || '');
        setDesignation(user.designation || 'RECONNAISSANCE OFFICER');
        setPicture(user.picture || '');
        setProfileCardId(user.activeProfileCard?.id || 'DEFAULT:STARS');
        setCardDisplayName(user.activeProfileCard?.displayName || '');
        setCardDisplayPhoto(user.activeProfileCard?.displayPhoto || '');
        setCropSource('');
    }, [user]);

    useEffect(() => {
        setCardDisplayName(canCustomizeSelectedCard ? selectedProfileCard?.displayName || '' : '');
        setCardDisplayPhoto(canCustomizeSelectedCard ? selectedProfileCard?.displayPhoto || '' : '');
        setCropSource('');
    }, [canCustomizeSelectedCard, profileCardId, selectedProfileCard?.displayName, selectedProfileCard?.displayPhoto]);

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const response = await api.put<CurrentUser>('/api/user/update', {
                name,
                designation,
                picture,
            });
            let nextUser = response.data;
            if (profileCardId !== (nextUser.activeProfileCard?.id || 'DEFAULT:STARS')) {
                const cardResponse = await api.put<CurrentUser>('/api/profile-cards/active', { cardId: profileCardId });
                nextUser = cardResponse.data;
            }
            if (cardDirty && canCustomizeSelectedCard) {
                await api.put<ProfileCardItem>(`/api/profile-cards/${profileCardId}/customize`, {
                    displayName: cardDisplayName,
                    displayPhoto: cardDisplayPhoto,
                });
                const refreshed = await api.get<CurrentUser>('/api/user/me');
                nextUser = refreshed.data;
            }
            setUser(nextUser);
            setName(nextUser.name || name);
            setDesignation(nextUser.designation || designation);
            setPicture(nextUser.picture || picture);
            setProfileCardId(nextUser.activeProfileCard?.id || 'DEFAULT:STARS');
            setCardDisplayName(nextUser.activeProfileCard?.displayName || '');
            setCardDisplayPhoto(nextUser.activeProfileCard?.displayPhoto || '');
            invalidateApiCache(`/api/user/${nextUser.userID}`);
            invalidateApiCache('/api/user/me');
            invalidateApiCache('/api/profile-cards/mine');
            invalidateApiCache(`/content/by-user/${nextUser.userID}`);
            invalidateApiCache('/content/all-content');
            setProfileEditorOpen(false);
            feedback.toast('Profil berhasil diperbarui.', 'success');
        } catch {
            feedback.toast('Gagal menyimpan profil.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleCancelProfile = () => {
        setName(user.name || '');
        setDesignation(user.designation || 'RECONNAISSANCE OFFICER');
        setPicture(user.picture || '');
        setProfileCardId(user.activeProfileCard?.id || 'DEFAULT:STARS');
        setCardDisplayName(user.activeProfileCard?.displayName || '');
        setCardDisplayPhoto(user.activeProfileCard?.displayPhoto || '');
        setCropSource('');
        setProfileEditorOpen(false);
    };

    const handleFollowBack = async (target: PublicUser) => {
        if (!target.userID || user.followingUserIds?.includes(target.userID)) return;
        try {
            const response = await api.post<CurrentUser>(`/api/user/following/${target.userID}`);
            setUser(response.data);
            invalidateApiCache('/api/user/following');
            invalidateApiCache('/api/user/me');
            await fetchFollowing(true);
            feedback.toast(`Follow back ${target.name}.`, 'success');
        } catch {
            feedback.toast('Follow back gagal diproses.', 'error');
        }
    };

    const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(String(reader.result || ''));
            setCropZoom(1);
            setCropX(0);
            setCropY(0);
        };
        reader.readAsDataURL(file);
        event.currentTarget.value = '';
    };

    const applyCroppedPhoto = async () => {
        if (!cropSource) return;
        const cropped = await cropImage(cropSource, cropZoom, cropX, cropY);
        setPicture(cropped);
        if (canCustomizeSelectedCard) {
            setCardDisplayPhoto(cropped);
        }
        setCropSource('');
    };

    const handleDeleteProfileCard = async () => {
        if (!canCustomizeSelectedCard || !selectedProfileCard) return;
        const accepted = await feedback.confirm({
            title: 'Delete Profile Card',
            message: `Card "${selectedProfileCard.name}" akan dihapus permanen dari akunmu.`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        const response = await api.delete<CurrentUser>(`/api/profile-cards/${selectedProfileCard.id}`);
        setUser(response.data);
        setProfileCardId(response.data.activeProfileCard?.id || 'DEFAULT:STARS');
        setCardDisplayName(response.data.activeProfileCard?.displayName || '');
        setCardDisplayPhoto(response.data.activeProfileCard?.displayPhoto || '');
        invalidateApiCache('/api/user/me');
        invalidateApiCache('/api/profile-cards/mine');
        invalidateApiCache(`/api/user/${response.data.userID}`);
    };

    const handleDelete = async (idContent: string) => {
        const accepted = await feedback.confirm({
            title: 'Hapus Tulisan',
            message: 'Data tulisan akan dihapus permanen dari arsip personal.',
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/content/${idContent}`);
        invalidateContentCaches(user.userID, idContent);
        await fetchMyContents(true);
        feedback.toast('Arsip berhasil dihapus.', 'success');
    };

    const handlePublishDraft = async (item: ContentItem) => {
        if (item.status !== 'DRAFT' || publishingDraftId) return;
        if (!item.head?.trim() || !stripHtml(item.paragrafs).trim()) {
            feedback.toast('Draft butuh judul dan isi sebelum dipublish.', 'error');
            return;
        }
        const accepted = await feedback.confirm({
            title: 'Publish Draft',
            message: `Draft "${item.head}" akan masuk ke database publik.`,
            confirmLabel: 'Publish',
        });
        if (!accepted) return;

        setPublishingDraftId(item.idContent);
        try {
            const response = await api.post<ContentItem>(`/content/drafts/${item.idContent}/publish`, buildDraftPublishPayload(item));
            discardLocalWriterDraft(user.userID, item.idContent);
            invalidateContentCaches(user.userID, item.idContent);
            setContents(current => [
                response.data,
                ...current.filter(existing => existing.idContent !== item.idContent && existing.idContent !== response.data.idContent),
            ]);
            await fetchMyContents(true);
            feedback.toast('Draft berhasil dipublish.', 'success');
        } catch {
            feedback.toast('Draft gagal dipublish.', 'error');
        } finally {
            setPublishingDraftId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] font-mono text-[#eee]">
            {/* TOP BANNER / HERO AREA (Gaya Modern Streaming Dashboard) */}
            <div className="relative border-b border-[#222] bg-gradient-to-b from-[#1a0505] via-[#111] to-[#0d0d0d] px-6 py-10 lg:px-12">
                <div className="mx-auto max-w-[1600px]">
                    <div className="mb-6">
                        <button type="button" onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#777] transition-all hover:text-[#e60000]">
                            <span className="text-[10px] font-black uppercase tracking-widest">{'<'} Return to Command Center</span>
                        </button>
                    </div>

                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 overflow-hidden border-2 border-[#e60000] bg-[#151515] shadow-lg shadow-red-950/40 md:h-20 md:w-20">
                                <img
                                    src={picture || user.picture || defaultAvatar}
                                    alt="User"
                                    width={80}
                                    height={80}
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-black uppercase tracking-wider text-white md:text-3xl">{name || user.name}</h1>
                                    <span className="border border-[#e60000]/40 bg-[#e60000]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#e60000]">
                                        {designation}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-[#777]">
                                    {user.username ? `@${user.username}` : user.email} // Terminal Clearance Level 4
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setProfileEditorOpen(true)}
                                className="border border-[#333] bg-[#141414] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#aaa] transition-all hover:border-[#e60000] hover:text-white"
                            >
                                Edit Credentials
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/write')}
                                className="bg-[#e60000] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-[4px_4px_0px_#333] transition-all hover:bg-white hover:text-[#e60000]"
                            >
                                + Create New Entry
                            </button>
                        </div>
                    </div>

                    {/* NAVIGATION TABS KAPSUL (Mirip IDLIX/Streaming Dashboard) */}
                    <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-[#222] pt-6">
                        <TabButton active={profileTab === 'about'} label="Profil" onClick={() => setProfileTab('about')} />
                        <TabButton active={profileTab === 'writings'} label="Writings" icon={<FileText size={13} />} count={publishedContents.length} onClick={() => setProfileTab('writings')} />
                        <TabButton active={profileTab === 'bookmarks'} label="Bookmarks" icon={<Bookmark size={13} />} count={bookmarks.length} onClick={() => setProfileTab('bookmarks')} />
                        <TabButton active={profileTab === 'following'} label="Following" icon={<Users size={13} />} count={following.length} onClick={() => setProfileTab('following')} />
                        <TabButton active={profileTab === 'followers'} label="Followers" icon={<UserCheck size={13} />} count={followers.length} onClick={() => setProfileTab('followers')} />
                        <TabButton active={profileTab === 'badges'} label="Badges" icon={<Award size={13} />} count={user.badges?.length ?? 0} onClick={() => setProfileTab('badges')} />
                        <TabButton active={profileTab === 'settings'} label="Settings" icon={<Settings size={13} />} onClick={() => setProfileTab('settings')} />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="mx-auto max-w-[1600px] p-6 lg:p-10">
                <div className="flex flex-col items-start gap-10 lg:flex-row">
                    
                    {/* === KOLOM KIRI: ORGANIZATIONAL SIDE CARD (AMAN DAN TIDAK DIGANGGU) === */}
                    <div className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-[380px]">
                        <p className="mb-3 pl-2 text-[10px] uppercase tracking-[0.3em] text-[#555]">Personnel ID Card</p>
                        
                        {profileCardId === 'DEFAULT:STARS' ? (
                            <div className="relative flex min-h-[280px] w-full overflow-hidden rounded-xl border border-[#333] bg-white shadow-2xl">
                                <div className="flex w-[40%] flex-col items-center justify-center border-r-[3px] border-white bg-[#1a3a63] p-4">
                                    <img src={logo} alt="S.T.A.R.S. Logo" width={180} height={180} className="w-[85%] object-contain" />
                                    <h2 className="mt-3 text-center text-[5px] font-black uppercase leading-tight tracking-normal text-white">Special Tactics and Rescue Service</h2>
                                </div>
                                <div className="relative flex flex-1 flex-col justify-between bg-white p-5 text-[#1a3a63]">
                                    <div>
                                        <h1 className="text-3xl font-black leading-none tracking-normal">POLICE</h1>
                                        <p className="text-[11px] font-bold">CENTRAL ARCHIVE DEP.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative border-b border-[#1a3a63] pb-0.5">
                                            <span className="block truncate text-sm font-black uppercase tracking-normal">{name || user.name || 'N/A'}</span>
                                            <span className="absolute -bottom-3 right-0 text-[6px] font-bold uppercase opacity-60">Officer Name</span>
                                        </div>
                                        <div className="relative border-b border-[#1a3a63] pb-0.5">
                                            <span className="block truncate text-xs font-black uppercase tracking-normal">{designation || 'Archive Officer'}</span>
                                            <span className="absolute -bottom-3 right-0 text-[6px] font-bold uppercase opacity-60">Asignation</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between gap-3">
                                        <div className="h-24 w-20 flex-shrink-0 border border-[#1a3a63] bg-gray-100 p-0.5 shadow-md">
                                            <img
                                                src={picture || user.picture || defaultAvatar}
                                                alt="Officer"
                                                width={80}
                                                height={96}
                                                className="h-full w-full object-cover grayscale contrast-125"
                                                referrerPolicy="no-referrer"
                                                onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                                            />
                                        </div>
                                        <div className="flex flex-1 flex-col items-end">
                                            <div className="w-full max-w-[100px] text-center">
                                                <div className="mb-0.5 truncate border-b border-[#1a3a63] pb-0.5 font-serif text-sm italic">GEBXBY</div>
                                                <span className="text-[7px] font-black uppercase">Authorized Signature</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <ProfileCardRenderer user={previewUser} card={previewProfileCard} />
                        )}

                        <div className="mt-4">
                            <BadgeStrip badges={user.badges} />
                        </div>

                        {user.suspensionMarked && (
                            <div className="mt-4 border border-[#e60000] bg-[#1a0b0b] p-4">
                                <div className="mb-2 flex items-center gap-2 text-[#e60000]">
                                    <ShieldAlert size={16} />
                                    <span className="font-mono text-[10px] font-black uppercase tracking-widest">Suspension Mark Active</span>
                                </div>
                                <div className="h-20 border border-dashed border-[#e60000]/40 bg-[#100]" />
                            </div>
                        )}
                    </div>

                    {/* === KOLOM KANAN: PANEL ISI BERDASARKAN TAB === */}
                    <div className="w-full flex-1">
                        
                        {/* Header Tab & Sortir */}
                        {profileTab === 'writings' && (
                            <div className="mb-6 flex items-center justify-between border-b border-[#222] pb-4">
                                <h3 className="text-lg font-black uppercase tracking-wider text-white">Secure Sector Archives</h3>
                                <select
                                    aria-label="Sort profile writings"
                                    value={sortOrder}
                                    onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
                                    className="cursor-pointer border border-[#333] bg-[#141414] p-2 px-4 font-mono text-[10px] font-bold uppercase text-[#e60000] outline-none focus:border-[#e60000]"
                                >
                                    <option value="newest">Newest Entry</option>
                                    <option value="oldest">Oldest Entry</option>
                                </select>
                            </div>
                        )}

                        <div className="grid gap-6">
                            {profileTab === 'about' ? (
                                <AboutPanel stats={profileStats} user={user} recent={contents.slice(0, 4)} />
                            ) : profileTab === 'writings' && contents.length === 0 ? (
                                <div className="border border-dashed border-[#222] py-20 text-center text-[#555]">[ NO DATA RECORDED IN THIS SECTOR ]</div>
                            ) : profileTab === 'writings' ? (
                                <LazyRenderList
                                    items={contents}
                                    getKey={(item) => item.idContent}
                                    estimateSize={190}
                                    className="grid gap-6"
                                    renderItem={(item) => (
                                        <ArchiveItem
                                            item={item}
                                            publishing={publishingDraftId === item.idContent}
                                            onPublish={() => void handlePublishDraft(item)}
                                            onEdit={() => navigate(`/write?edit=${item.idContent}`)}
                                            onDelete={() => void handleDelete(item.idContent)}
                                        />
                                    )}
                                />
                            ) : profileTab === 'badges' ? (
                                <BadgesPanel badges={user.badges ?? []} onOpen={setSelectedBadge} />
                            ) : profileTab === 'bookmarks' && bookmarks.length === 0 ? (
                                <div className="border border-dashed border-[#222] py-20 text-center text-[#555]">[ NO BOOKMARKS SAVED ]</div>
                            ) : profileTab === 'bookmarks' ? (
                                <LazyRenderList
                                    items={bookmarks}
                                    getKey={(item) => item.idContent}
                                    estimateSize={130}
                                    className="grid gap-6"
                                    renderItem={(item) => (
                                        <BookmarkItem item={item} viewerUserId={user.userID} onOpen={() => navigate(`/read/${item.idContent}`)} />
                                    )}
                                />
                            ) : profileTab === 'following' && following.length === 0 ? (
                                <div className="border border-dashed border-[#222] py-20 text-center text-[#555]">[ NO FOLLOWING DATA ]</div>
                            ) : profileTab === 'following' ? (
                                <LazyRenderList
                                    items={following}
                                    getKey={(target) => target.userID}
                                    estimateSize={110}
                                    className="grid gap-6"
                                    renderItem={(target) => (
                                        <FollowingItem target={target} onOpen={() => navigate(`/profile/${target.userID}`)} />
                                    )}
                                />
                            ) : profileTab === 'followers' && followers.length === 0 ? (
                                <div className="border border-dashed border-[#222] py-20 text-center text-[#555]">[ NO FOLLOWER DATA ]</div>
                            ) : profileTab === 'followers' ? (
                                <LazyRenderList
                                    items={followers}
                                    getKey={(target) => target.userID}
                                    estimateSize={110}
                                    className="grid gap-6"
                                    renderItem={(target) => (
                                        <FollowingItem
                                            target={target}
                                            onOpen={() => navigate(`/profile/${target.userID}`)}
                                            actionLabel={user.followingUserIds?.includes(target.userID) ? 'Following' : 'Follow Back'}
                                            actionDisabled={user.followingUserIds?.includes(target.userID)}
                                            onAction={() => void handleFollowBack(target)}
                                        />
                                    )}
                                />
                            ) : (
                                /* Tab Settings Interaktif */
                                <SettingsPanel
                                    name={name}
                                    setName={setName}
                                    designation={designation}
                                    setDesignation={setDesignation}
                                    profileCardId={profileCardId}
                                    setProfileCardId={setProfileCardId}
                                    availableProfileCards={availableProfileCards}
                                    canCustomizeSelectedCard={canCustomizeSelectedCard}
                                    cardDisplayName={cardDisplayName}
                                    setCardDisplayName={setCardDisplayName}
                                    onSave={() => void handleSaveProfile()}
                                    saving={savingProfile}
                                    dirty={profileDirty}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL EDIT PROFIL LENGKAP */}
            {profileEditorOpen && (
                <Modal
                    title="Edit Officer Credentials"
                    onClose={handleCancelProfile}
                    footer={(
                        <>
                            <UiButton onClick={handleCancelProfile} disabled={savingProfile}>Cancel</UiButton>
                            <UiButton onClick={() => void handleSaveProfile()} disabled={!profileDirty || savingProfile} variant="danger">
                                {savingProfile ? 'Saving...' : 'Save Changes'}
                            </UiButton>
                        </>
                    )}
                >
                    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                        <div className="space-y-4">
                            <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                                Profile Name
                                <input
                                    value={name}
                                    maxLength={80}
                                    onChange={(event) => setName(event.target.value)}
                                    className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]"
                                />
                            </label>
                            <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                                Designation / Role
                                <input
                                    value={designation}
                                    maxLength={80}
                                    onChange={(event) => setDesignation(event.target.value.toUpperCase())}
                                    className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]"
                                />
                            </label>
                            <div>
                                <p className="m-0 mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">Profile Photo</p>
                                <div className="flex flex-wrap gap-2">
                                    <label className="flex h-10 cursor-pointer items-center border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#aaa] hover:border-[#e60000] hover:text-[#e60000]">
                                        Upload Image File
                                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoSelect} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setPicture(''); setCardDisplayPhoto(''); }}
                                        disabled={!picture}
                                        className="h-10 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#aaa] hover:border-white hover:text-white disabled:opacity-40"
                                    >
                                        Reset Photo
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-[#222] pt-4">
                                <label className="mb-2 block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">Card Template</label>
                                <select
                                    value={profileCardId}
                                    onChange={(event) => setProfileCardId(event.target.value)}
                                    className="h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-[10px] font-black uppercase text-white outline-none focus:border-[#e60000]"
                                >
                                    {availableProfileCards.map(card => (
                                        <option key={card.id} value={card.id}>{card.name}</option>
                                    ))}
                                </select>
                            </div>

                            {canCustomizeSelectedCard && (
                                <div className="space-y-3 border border-[#222] bg-[#141414] p-3">
                                    <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                                        Custom Name On Card
                                        <input
                                            value={cardDisplayName}
                                            maxLength={80}
                                            onChange={(event) => setCardDisplayName(event.target.value)}
                                            placeholder={name || user.name}
                                            className="mt-2 h-10 w-full border border-[#333] bg-[#101010] px-3 font-mono text-[10px] font-black uppercase text-white outline-none focus:border-[#e60000]"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteProfileCard()}
                                        className="h-9 border border-[#e60000] px-3 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                                    >
                                        Delete Custom Card
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="border border-[#222] bg-[#141414] p-3">
                                <p className="m-0 mb-3 font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">Preview</p>
                                <div className="aspect-square overflow-hidden border border-[#333] bg-[#090909]">
                                    <img
                                        src={cardDisplayPhoto || picture || user.picture || defaultAvatar}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            </div>

                            {cropSource && (
                                <div className="border border-[#222] bg-[#151515] p-4">
                                    <div className="mb-3 aspect-square w-full overflow-hidden border border-[#333] bg-[#090909]">
                                        <img
                                            src={cropSource}
                                            alt="Crop"
                                            className="h-full w-full object-cover"
                                            style={{ transform: `scale(${cropZoom}) translate(${cropX}px, ${cropY}px)` }}
                                        />
                                    </div>
                                    <label className="mb-1 block text-[9px] text-[#777]">Zoom</label>
                                    <input className="mb-2 w-full" type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => void applyCroppedPhoto()} className="border border-[#e60000] px-3 py-1.5 text-[9px] font-black uppercase text-[#e60000]">Apply</button>
                                        <button type="button" onClick={() => setCropSource('')} className="border border-[#333] px-3 py-1.5 text-[9px] font-black uppercase text-[#777]">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL DETAIL BADGE */}
            {selectedBadge && (
                <Modal
                    title={selectedBadge.label}
                    description={`${selectedBadge.custom ? 'Custom Badge' : 'Core Badge'} // ${selectedBadge.automatic ? 'Automatic' : 'Manual'}`}
                    onClose={() => setSelectedBadge(null)}
                    size="sm"
                    footer={<UiButton onClick={() => setSelectedBadge(null)}>Close</UiButton>}
                >
                    <div className="mb-4 text-3xl">{selectedBadge.icon}</div>
                    <p className="m-0 whitespace-pre-wrap font-sans text-sm leading-7 text-[#aaa]">{selectedBadge.description || 'No description provided.'}</p>
                </Modal>
            )}
        </div>
    );
}

// Sub-komponen Pendukung UI
function TabButton({ active, label, icon, count, onClick }: { active: boolean; label: string; icon?: ReactNode; count?: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-11 items-center gap-2.5 border px-5 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                active
                    ? 'border-[#e60000] bg-[#e60000] text-white shadow-md shadow-red-950/30'
                    : 'border-[#222] bg-[#141414] text-[#888] hover:border-[#e60000]/70 hover:text-white'
            }`}
        >
            {icon}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-[8px] font-black ${active ? 'bg-black/30 text-white' : 'bg-[#222] text-[#aaa]'}`}>
                    {count}
                </span>
            )}
        </button>
    );
}

function ArchiveItem({ item, publishing, onPublish, onEdit, onDelete }: any) {
    const themeColor = getCategoryColor(item.kategori);
    const isDraft = item.status === 'DRAFT';
    return (
        <div className="bg-[#141414] p-6 shadow-inner transition-all duration-300 hover:border-[#e60000]" style={{ border: `1px solid #222`, borderLeft: `3px solid ${themeColor}` }}>
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-4">
                        <span className="font-mono text-[10px] font-bold" style={{ color: themeColor }}>ENTRY ID: {item.idContent?.substring(0, 8)}</span>
                        <span className="font-mono text-[9px] font-bold uppercase text-[#555]">FILE DATE: {formatDate(item.createdAt)}</span>
                        <span className="border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor, borderColor: themeColor, backgroundColor: `${themeColor}15` }}>{item.kategori}</span>
                        {isDraft && <span className="border border-[#e60000] bg-[#200707] px-3 py-0.5 text-[9px] font-black uppercase text-[#e60000]">Draft</span>}
                    </div>
                    <h3 className="mb-2 text-xl font-black uppercase text-white">{item.head}</h3>
                    <p className="line-clamp-2 max-w-3xl font-sans text-sm leading-relaxed text-[#999]">{stripHtml(item.paragrafs).substring(0, 180)}...</p>
                </div>
                <div className="flex w-full flex-row gap-2 md:w-auto md:flex-col">
                    {isDraft && (
                        <button type="button" onClick={onPublish} disabled={publishing} className="flex-1 border border-[#e60000] bg-[#e60000] px-5 py-2 text-[10px] font-bold uppercase text-white hover:bg-white hover:text-[#e60000] md:w-28">
                            {publishing ? 'Publishing' : 'Publish'}
                        </button>
                    )}
                    <button type="button" onClick={onEdit} disabled={publishing} className="flex-1 border border-[#333] px-5 py-2 text-[10px] font-bold uppercase text-white hover:border-white md:w-28">Edit File</button>
                    <button type="button" onClick={onDelete} disabled={publishing} className="flex-1 border border-[#333] px-5 py-2 text-[10px] font-bold uppercase text-white hover:bg-[#e60000] md:w-28">Delete</button>
                </div>
            </div>
        </div>
    );
}

function AboutPanel({ stats, user, recent }: any) {
    return (
        <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
                <ProfileMetric label="Writings" value={stats.writings} />
                <ProfileMetric label="Drafts" value={stats.drafts} danger={stats.drafts > 0} />
                <ProfileMetric label="Total UP" value={stats.up} />
                <ProfileMetric label="Comments" value={stats.comments} />
                <ProfileMetric label="Views" value={stats.views} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <div className="border border-[#222] bg-[#141414] p-6">
                    <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Officer Dossier</p>
                    <h3 className="m-0 mt-3 font-mono text-xl font-black uppercase text-white">{user.name}</h3>
                    <p className="m-0 mt-2 font-mono text-[10px] uppercase text-[#777]">{user.username ? `@${user.username}` : user.designation}</p>
                    <p className="m-0 mt-4 font-sans text-sm leading-7 text-[#999]">{user.moto || 'No operational notes recorded.'}</p>
                </div>
                <div className="border border-[#222] bg-[#141414] p-6">
                    <p className="m-0 mb-4 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Recent Signal Log</p>
                    {recent.length === 0 ? (
                        <div className="border border-dashed border-[#333] py-10 text-center font-mono text-[10px] uppercase text-[#555]">[ No Activity ]</div>
                    ) : (
                        <div className="space-y-3">
                            {recent.map((item: any) => (
                                <div key={item.idContent} className="border border-[#222] bg-[#101010] p-3">
                                    <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{item.head}</p>
                                    <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{item.status === 'DRAFT' ? 'Draft' : 'Published'} // {formatDate(item.updatedAt || item.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function ProfileMetric({ label, value, danger = false }: any) {
    return (
        <div className="border border-[#222] bg-[#141414] p-4">
            <p className="m-0 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[#666]">{label}</p>
            <p className={`m-0 mt-2 font-mono text-2xl font-black ${danger ? 'text-[#e60000]' : 'text-white'}`}>{value}</p>
        </div>
    );
}

function BadgesPanel({ badges, onOpen }: any) {
    if (badges.length === 0) return <div className="border border-dashed border-[#222] py-20 text-center text-[#555]">[ NO BADGES ]</div>;
    return (
        <LazyRenderList
            items={badges}
            getKey={(badge: any) => badge.id ?? badge.code ?? badge.label}
            estimateSize={126}
            className="grid gap-4 md:grid-cols-2"
            renderItem={(badge: any) => (
                <button type="button" onClick={() => onOpen(badge)} className="border border-[#222] bg-[#141414] p-5 text-left transition-all hover:border-[#e60000]">
                    <div className="mb-3 flex items-center gap-3">
                        <span className="text-2xl">{badge.custom ? badge.icon : '▣'}</span>
                        <div className="min-w-0">
                            <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{badge.label}</p>
                            <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{badge.custom ? 'Custom' : 'Core'}</p>
                        </div>
                    </div>
                    <p className="m-0 line-clamp-2 font-sans text-sm text-[#999]">{badge.description}</p>
                </button>
            )}
        />
    );
}

function BookmarkItem({ item, viewerUserId, onOpen }: any) {
    const navigate = useNavigate();
    const themeColor = getCategoryColor(item.kategori);
    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => { if (event.key === 'Enter') onOpen(); }}
            className="group border border-[#222] bg-[#141414] p-6 text-left transition-all hover:border-[#e60000]"
            style={{ borderLeft: `3px solid ${themeColor}` }}
        >
            <div className="mb-2 flex items-center gap-3">
                <span className="border px-2 py-0.5 text-[9px] font-black uppercase" style={{ color: themeColor, borderColor: themeColor, backgroundColor: `${themeColor}15` }}>{item.kategori}</span>
                <span onClick={(e) => { e.stopPropagation(); navigate(profilePathForUser(item.user?.userID, viewerUserId) || '/'); }} className="text-[9px] uppercase text-[#777] hover:underline">
                    {item.user?.name || 'Unknown'}
                </span>
            </div>
            <h3 className="mb-2 text-xl font-black uppercase text-white group-hover:text-[#e60000]">{item.head}</h3>
            <p className="line-clamp-2 text-sm text-[#999]">{stripHtml(item.paragrafs).substring(0, 200)}...</p>
        </article>
    );
}

function FollowingItem({ target, onOpen, actionLabel, actionDisabled, onAction }: any) {
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(target.name || 'User')}`;
    return (
        <div className="flex flex-col gap-3 border border-[#222] bg-[#141414] p-4 transition-all hover:border-[#e60000] sm:flex-row sm:items-center">
            <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                <div className="h-12 w-12 overflow-hidden border border-[#333]">
                    <img src={target.picture || defaultAvatar} alt="" width={48} height={48} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{target.name}</p>
                    <p className="m-0 mt-1 truncate font-mono text-[10px] uppercase text-[#666]">{target.designation || 'Officer'}</p>
                </div>
            </button>
            {actionLabel && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onAction(); }} disabled={actionDisabled} className="h-9 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#aaa] hover:border-[#e60000] hover:text-[#e60000] disabled:opacity-40">
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

function SettingsPanel({ name, setName, designation, setDesignation, profileCardId, setProfileCardId, availableProfileCards, canCustomizeSelectedCard, cardDisplayName, setCardDisplayName, onSave, saving, dirty }: any) {
    return (
        <div className="border border-[#222] bg-[#141414] p-6 space-y-6">
            <div>
                <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Quick Preferences</p>
                <h3 className="m-0 mt-1 text-xl font-black uppercase text-white">Direct Terminal Config</h3>
            </div>
            <div className="space-y-4 max-w-xl">
                <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                    Officer Name
                    <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]" />
                </label>
                <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                    Designation
                    <input value={designation} onChange={(e) => setDesignation(e.target.value.toUpperCase())} className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]" />
                </label>
                <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                    Active Card Template
                    <select value={profileCardId} onChange={(e) => setProfileCardId(e.target.value)} className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]">
                        {availableProfileCards.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                {canCustomizeSelectedCard && (
                    <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#777]">
                        Card Display Name
                        <input value={cardDisplayName} onChange={(e) => setCardDisplayName(e.target.value)} className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]" />
                    </label>
                )}
                <button type="button" onClick={onSave} disabled={!dirty || saving} className="bg-[#e60000] px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[4px_4px_0px_#222] hover:bg-white hover:text-[#e60000] disabled:opacity-40">
                    {saving ? 'Syncing...' : 'Save Quick Settings'}
                </button>
            </div>
        </div>
    );
}

function invalidateContentCaches(userId: string, contentId?: string) {
    invalidateApiCache('/content/all-content');
    invalidateApiCache(`/content/by-user/${userId}`);
    invalidateApiCache('/content/feed');
    invalidateApiCache('/content/feed-page');
    invalidateApiCache('/content/latest');
    invalidateApiCache('/content/categories');
    invalidateApiCache('/content/analytics');
    if (contentId) invalidateApiCache(`/content/${contentId}`);
}

function buildDraftPublishPayload(item: ContentItem) {
    return { head: item.head, subtitle: item.subtitle, paragrafs: item.paragrafs, kategori: item.kategori || 'General' };
}

function discardLocalWriterDraft(userId: string, draftId: string) {
    const prefix = `gebxby:writer-draft:${userId}:`;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(prefix)) continue;
        try {
            const draft = JSON.parse(localStorage.getItem(key) || '{}');
            if (key === `${prefix}${draftId}` || draft.draftId === draftId) localStorage.removeItem(key);
        } catch {
            if (key === `${prefix}${draftId}`) localStorage.removeItem(key);
        }
    }
}

function isGiftedProfileCard(card?: ProfileCardItem) {
    return Boolean(card?.custom && !card.template && !card.code && card.id && !card.id.startsWith('DEFAULT:'));
}

function cropImage(source: string, zoom: number, offsetX: number, offsetY: number) {
    return new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const size = 512;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            if (!context) { reject(new Error('Canvas unavailable')); return; }
            context.fillStyle = '#111';
            context.fillRect(0, 0, size, size);
            const scale = Math.max(size / image.width, size / image.height) * zoom;
            const drawWidth = image.width * scale;
            const drawHeight = image.height * scale;
            const x = (size - drawWidth) / 2 + offsetX * 2;
            const y = (size - drawHeight) / 2 + offsetY * 2;
            context.drawImage(image, x, y, drawWidth, drawHeight);
            resolve(canvas.toDataURL('image/webp', 0.86));
        };
        image.onerror = reject;
        image.src = source;
    });
}

function defaultCardLayout() {
    return {
        photoX: 68, photoY: 16, photoW: 22, photoH: 28,
        nameX: 36, nameY: 62, nameW: 50, nameH: 10,
        designationX: 36, designationY: 72, designationW: 50, designationH: 8,
        statsX: 5, statsY: 78, statsW: 30, statsH: 12,
        nameFontSize: 0.9, designationFontSize: 0.9, statsFontSize: 1.2,
        textColor: '#111111', accentColor: '#e60000',
    };
}

function formatDate(dateString?: string) {
    if (!dateString) return 'NO DATA';
    return formatIndonesiaDate(dateString);
}