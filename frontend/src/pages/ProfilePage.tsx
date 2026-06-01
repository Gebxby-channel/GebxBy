import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bookmark, FileText, ShieldAlert, Users } from 'lucide-react';
import api, { cachedGet, invalidateApiCache, isRequestCanceled } from '../lib/api';
import logo from '../assets/S.T.A.R.S._logo.webp';
import { DEFAULT_CATEGORIES, getCategoryColor } from '../utils/categoryColors';
import { profilePathForUser } from '../utils/profilePath';
import { stripHtml } from '../utils/sanitize';
import type { Badge, ContentItem, CurrentUser, ProfileCardItem, PublicUser } from '../types/forum';
import BadgeStrip from '../components/BadgeStrip';
import { useFeedback } from '../components/feedback';
import { formatIndonesiaDate } from '../utils/time';
import ProfileCardRenderer from '../components/ProfileCardRenderer';
import { Modal, Button as UiButton } from '../components/ui';

interface EditForm {
    head: string;
    paragrafs: string;
    kategori: string;
}

export default function ProfilePage({ user, setUser }: { user: CurrentUser; setUser: (user: CurrentUser) => void }) {
    const feedback = useFeedback();
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [bookmarks, setBookmarks] = useState<ContentItem[]>([]);
    const [following, setFollowing] = useState<PublicUser[]>([]);
    const [profileTab, setProfileTab] = useState<'about' | 'writings' | 'bookmarks' | 'following' | 'badges'>('about');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ head: '', paragrafs: '', kategori: 'General' });
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
    const [editingCardPhoto, setEditingCardPhoto] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileEditorOpen, setProfileEditorOpen] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

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

    useEffect(() => {
        const controller = new AbortController();
        void Promise.all([
            fetchMyContents(false, controller.signal),
            fetchBookmarks(false, controller.signal),
            fetchFollowing(false, controller.signal),
        ]).catch((error) => {
            if (!isRequestCanceled(error)) {
                setContents([]);
                setBookmarks([]);
                setFollowing([]);
            }
        });
        return () => controller.abort();
    }, [fetchBookmarks, fetchFollowing, fetchMyContents]);

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
        setEditingCardPhoto(false);
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
        setEditingCardPhoto(false);
        setProfileEditorOpen(false);
    };

    const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setEditingCardPhoto(false);
            setCropSource(String(reader.result || ''));
            setCropZoom(1);
            setCropX(0);
            setCropY(0);
        };
        reader.readAsDataURL(file);
        event.currentTarget.value = '';
    };

    const handleCardPhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setEditingCardPhoto(true);
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
        if (editingCardPhoto) {
            setCardDisplayPhoto(cropped);
        } else {
            setPicture(cropped);
        }
        setCropSource('');
        setEditingCardPhoto(false);
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

    const handleUpdate = async (id: string) => {
        await api.put(`/content/edit/${id}`, editForm);
        invalidateContentCaches(user.userID, id);
        setEditingId(null);
        await fetchMyContents(true);
    };

    const startEdit = (item: ContentItem) => {
        setEditingId(item.idContent);
        setEditForm({ head: item.head, paragrafs: stripHtml(item.paragrafs), kategori: item.kategori || 'General' });
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
    };

    return (
        <div className="min-h-screen bg-[#111] p-6 font-mono text-[#eee] lg:p-10">
            <div className="mx-auto max-w-[1600px]">
                <div className="mb-10 border-b border-[#2a2a2a] pb-4">
                    <button type="button" onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#888] transition-all duration-300 hover:text-[#e60000]">
                        <span className="text-xs font-bold uppercase tracking-widest">{'<'} Back to Command Center</span>
                    </button>
                </div>

                <div className="flex flex-col items-start gap-10 lg:flex-row">
                    <div className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-[380px]">
                        <p className="mb-3 pl-2 text-[10px] uppercase tracking-[0.3em] text-[#444]">Personnel Side ID</p>
                        {profileCardId === 'DEFAULT:STARS' ? (
                        <div className="relative flex min-h-[280px] w-full overflow-hidden rounded-xl border border-[#2a2a2a] bg-white shadow-2xl">
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
                        <div className="mt-3">
                            <BadgeStrip badges={user.badges} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setProfileEditorOpen(true)}
                                className="border border-[#e60000] px-4 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                            >
                                Edit Profile
                            </button>
                        </div>

                        {user.suspensionMarked && (
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
                        <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-[#2a2a2a] pb-6 md:flex-row md:items-center">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                                    {profileTitle(profileTab)}
                                </h2>
                                <p className="font-mono text-xs text-[#888]">
                                    {profileSubtitle(profileTab, contents.length, bookmarks.length, following.length, user.badges?.length ?? 0)}
                                </p>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
                                <ProfileTabButton active={profileTab === 'about'} label="About" onClick={() => setProfileTab('about')} />
                                <ProfileTabButton active={profileTab === 'writings'} label="Writings" icon={<FileText size={13} />} onClick={() => setProfileTab('writings')} />
                                <ProfileTabButton active={profileTab === 'bookmarks'} label="Bookmarks" icon={<Bookmark size={13} />} onClick={() => setProfileTab('bookmarks')} />
                                <ProfileTabButton active={profileTab === 'following'} label="Following" icon={<Users size={13} />} onClick={() => setProfileTab('following')} />
                                <ProfileTabButton active={profileTab === 'badges'} label="Badges" icon={<Award size={13} />} onClick={() => setProfileTab('badges')} />
                                <select
                                    id="profile-writing-sort"
                                    name="profileWritingSort"
                                    aria-label="Sort profile writings"
                                    value={sortOrder}
                                    onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
                                    className={`${profileTab === 'writings' ? 'block' : 'hidden'} cursor-pointer border border-[#333] bg-[#111] p-3 font-mono text-[10px] font-bold uppercase text-[#e60000] outline-none focus:border-[#e60000]`}
                                >
                                    <option value="newest">Newest Entry</option>
                                    <option value="oldest">Oldest Entry</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => navigate('/write')}
                                    className="flex-1 bg-[#e60000] px-8 py-3 text-xs font-black uppercase tracking-normal text-white shadow-[4px_4px_0px_#444] transition-all duration-300 hover:bg-white hover:text-[#e60000] md:flex-none"
                                >
                                    + Create New Entry
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {profileTab === 'about' ? (
                                <AboutPanel stats={profileStats} user={user} recent={contents.slice(0, 4)} />
                            ) : profileTab === 'writings' && contents.length === 0 ? (
                                <div className="border border-dashed border-[#2a2a2a] py-20 text-center font-mono text-[#444]">[ NO DATA RECORDED ]</div>
                            ) : profileTab === 'writings' ? (
                                contents.map(item => (
                                    <ArchiveItem
                                        key={item.idContent}
                                        item={item}
                                        editing={editingId === item.idContent}
                                        editForm={editForm}
                                        setEditForm={setEditForm}
                                        onEdit={() => startEdit(item)}
                                        onCancel={() => setEditingId(null)}
                                        onSave={() => void handleUpdate(item.idContent)}
                                        onDelete={() => void handleDelete(item.idContent)}
                                    />
                                ))
                            ) : profileTab === 'badges' ? (
                                <BadgesPanel badges={user.badges ?? []} onOpen={setSelectedBadge} />
                            ) : profileTab === 'bookmarks' && bookmarks.length === 0 ? (
                                <div className="border border-dashed border-[#2a2a2a] py-20 text-center font-mono text-[#444]">[ NO BOOKMARKS SAVED ]</div>
                            ) : profileTab === 'bookmarks' ? (
                                bookmarks.map(item => (
                                    <BookmarkItem key={item.idContent} item={item} viewerUserId={user.userID} onOpen={() => navigate(`/read/${item.idContent}`)} />
                                ))
                            ) : following.length === 0 ? (
                                <div className="border border-dashed border-[#2a2a2a] py-20 text-center font-mono text-[#444]">[ NO FOLLOWING DATA ]</div>
                            ) : (
                                following.map(target => (
                                    <FollowingItem key={target.userID} target={target} onOpen={() => navigate(`/profile/${target.userID}`)} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {profileEditorOpen && (
                <Modal
                    title="Edit Profile"
                    onClose={handleCancelProfile}
                    footer={(
                        <>
                            <UiButton onClick={handleCancelProfile} disabled={savingProfile}>Cancel</UiButton>
                            <UiButton onClick={() => void handleSaveProfile()} disabled={!profileDirty || savingProfile} variant="danger">
                                {savingProfile ? 'Saving' : 'Save Profile'}
                            </UiButton>
                        </>
                    )}
                >
                    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                        <div className="space-y-4">
                            <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#666]">
                                Profile Name
                                <input
                                    id="profile-display-name"
                                    name="profileDisplayName"
                                    aria-label="Profile name"
                                    value={name}
                                    maxLength={80}
                                    onChange={(event) => setName(event.target.value)}
                                    className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]"
                                />
                            </label>
                            <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#666]">
                                Role / Designation
                                <input
                                    id="profile-designation"
                                    name="profileDesignation"
                                    aria-label="Profile designation"
                                    value={designation}
                                    maxLength={80}
                                    onChange={(event) => setDesignation(event.target.value.toUpperCase())}
                                    className="mt-2 h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-xs font-black uppercase text-white outline-none focus:border-[#e60000]"
                                />
                            </label>
                            <div>
                                <p className="m-0 mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#666]">Profile Photo</p>
                                <div className="flex flex-wrap gap-2">
                                    <label className="flex h-10 cursor-pointer items-center border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]">
                                        Change Profile Photo
                                        <input id="profile-photo-upload" name="profilePhoto" aria-label="Profile photo upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoSelect} />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setPicture('')}
                                        disabled={!picture}
                                        className="h-10 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Use Account Photo
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-[#2a2a2a] pt-4">
                                <label className="mb-2 block font-mono text-[9px] font-black uppercase tracking-widest text-[#666]">Card Model</label>
                                <select
                                    id="profile-card-model"
                                    name="profileCardModel"
                                    aria-label="Profile card model"
                                    value={profileCardId}
                                    onChange={(event) => setProfileCardId(event.target.value)}
                                    className="h-11 w-full border border-[#333] bg-[#101010] px-3 font-mono text-[10px] font-black uppercase text-white outline-none focus:border-[#e60000]"
                                >
                                    {availableProfileCards.map(card => (
                                        <option key={card.id} value={card.id}>{card.name}</option>
                                    ))}
                                </select>
                            </div>

                            {canCustomizeSelectedCard ? (
                                <div className="space-y-3 border border-[#2a2a2a] bg-[#111] p-3">
                                    <label className="block font-mono text-[9px] font-black uppercase tracking-widest text-[#666]">
                                        Name On Card
                                        <input
                                            id="profile-card-display-name"
                                            name="profileCardDisplayName"
                                            aria-label="Name on profile card"
                                            value={cardDisplayName}
                                            maxLength={80}
                                            onChange={(event) => setCardDisplayName(event.target.value)}
                                            placeholder={name || user.name || 'Use profile name'}
                                            className="mt-2 h-10 w-full border border-[#333] bg-[#101010] px-3 font-mono text-[10px] font-black uppercase text-white outline-none focus:border-[#e60000]"
                                        />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <label className="flex h-9 cursor-pointer items-center border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]">
                                            Change Card Photo
                                            <input id="profile-card-photo-upload" name="profileCardPhoto" aria-label="Profile card photo upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCardPhotoSelect} />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setCardDisplayPhoto('')}
                                            disabled={!cardDisplayPhoto}
                                            className="h-9 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Use Profile Photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleDeleteProfileCard()}
                                            className="h-9 border border-[#e60000] px-3 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                                        >
                                            Delete Card
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="m-0 border border-[#2a2a2a] bg-[#111] p-3 font-mono text-[9px] uppercase leading-5 text-[#555]">
                                    Default card mengikuti nama, role, dan foto profil utama.
                                </p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="border border-[#2a2a2a] bg-[#111] p-3">
                                <p className="m-0 mb-3 font-mono text-[9px] font-black uppercase tracking-widest text-[#666]">Preview</p>
                                <div className="aspect-square overflow-hidden border border-[#333] bg-[#090909]">
                                    <img
                                        src={cardDisplayPhoto || picture || user.picture || defaultAvatar}
                                        alt="Profile preview"
                                        width={260}
                                        height={260}
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                                    />
                                </div>
                            </div>

                            {cropSource && (
                                <div className="border border-[#2a2a2a] bg-[#151515] p-4">
                                    <div className="mb-3 aspect-square w-full overflow-hidden border border-[#333] bg-[#090909]">
                                        <img
                                            src={cropSource}
                                            alt="Crop preview"
                                            width={260}
                                            height={260}
                                            className="h-full w-full object-cover"
                                            style={{
                                                transform: `scale(${cropZoom}) translate(${cropX}px, ${cropY}px)`,
                                            }}
                                        />
                                    </div>
                                    <label className="mb-2 block font-mono text-[9px] uppercase text-[#666]">Zoom</label>
                                    <input id="profile-crop-zoom" name="profileCropZoom" aria-label="Photo crop zoom" className="mb-3 w-full" type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} />
                                    <label className="mb-2 block font-mono text-[9px] uppercase text-[#666]">Horizontal</label>
                                    <input id="profile-crop-x" name="profileCropX" aria-label="Photo crop horizontal position" className="mb-3 w-full" type="range" min="-80" max="80" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} />
                                    <label className="mb-2 block font-mono text-[9px] uppercase text-[#666]">Vertical</label>
                                    <input id="profile-crop-y" name="profileCropY" aria-label="Photo crop vertical position" className="mb-3 w-full" type="range" min="-80" max="80" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} />
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => void applyCroppedPhoto()} className="border border-[#e60000] px-4 py-2 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white">{editingCardPhoto ? 'Apply Card Photo' : 'Apply Profile Photo'}</button>
                                        <button type="button" onClick={() => { setCropSource(''); setEditingCardPhoto(false); }} className="border border-[#333] px-4 py-2 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white">Cancel Crop</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
            {selectedBadge && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md border border-[#2a2a2a] bg-[#0d0d0d] p-6">
                        <div className="mb-4 border-l-4 border-[#e60000] pl-4">
                            <p className="m-0 text-3xl">{selectedBadge.icon}</p>
                            <h2 className="m-0 mt-2 font-mono text-2xl font-black uppercase text-white">{selectedBadge.label}</h2>
                            <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">{selectedBadge.custom ? 'Custom Badge' : 'Core Badge'} // {selectedBadge.automatic ? 'Automatic' : 'Manual'}</p>
                        </div>
                        <p className="m-0 whitespace-pre-wrap font-sans text-sm leading-7 text-[#ccc]">{selectedBadge.description || 'No description.'}</p>
                        <button type="button" onClick={() => setSelectedBadge(null)} className="mt-6 border border-[#333] px-5 py-2 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ArchiveItem({
    item,
    editing,
    editForm,
    setEditForm,
    onEdit,
    onCancel,
    onSave,
    onDelete,
}: {
    item: ContentItem;
    editing: boolean;
    editForm: EditForm;
    setEditForm: (form: EditForm) => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    const themeColor = getCategoryColor(item.kategori);
    return (
        <div className="bg-[#181818] p-6 shadow-inner transition-all duration-300" style={{ border: `1px solid #2a2a2a`, borderLeft: `3px solid ${themeColor}` }}>
            {editing ? (
                <div className="space-y-4">
                    <input id={`profile-edit-title-${item.idContent}`} name={`profileEditTitle-${item.idContent}`} aria-label="Edit writing title" className="w-full border border-[#333] bg-[#111] p-3 font-mono text-white outline-none focus:border-[#e60000]" value={editForm.head} onChange={(event) => setEditForm({ ...editForm, head: event.target.value })} />
                    <select id={`profile-edit-category-${item.idContent}`} name={`profileEditCategory-${item.idContent}`} aria-label="Edit writing category" className="w-full border border-[#333] bg-[#111] p-3 font-mono text-white outline-none" value={editForm.kategori} onChange={(event) => setEditForm({ ...editForm, kategori: event.target.value })}>
                        {DEFAULT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <textarea id={`profile-edit-body-${item.idContent}`} name={`profileEditBody-${item.idContent}`} aria-label="Edit writing body" className="h-40 w-full border border-[#333] bg-[#111] p-3 font-mono text-white outline-none" value={editForm.paragrafs} onChange={(event) => setEditForm({ ...editForm, paragrafs: event.target.value })} />
                    <div className="flex gap-3">
                        <button type="button" onClick={onSave} className="bg-[#e60000] px-6 py-2 text-xs font-bold uppercase">Confirm</button>
                        <button type="button" onClick={onCancel} className="bg-[#333] px-6 py-2 text-xs font-bold uppercase">Abort</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-4">
                            <span className="font-mono text-[10px] font-bold" style={{ color: themeColor }}>ENTRY ID: {item.idContent?.substring(0, 8)}</span>
                            <span className="font-mono text-[9px] font-bold uppercase text-[#444]">FILE DATE: {formatDate(item.createdAt)}</span>
                            <span className="border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor, borderColor: themeColor, backgroundColor: `${themeColor}15` }}>{item.kategori}</span>
                            {item.status === 'DRAFT' && (
                                <span className="border border-[#e60000] bg-[#200707] px-3 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#e60000]">Draft</span>
                            )}
                        </div>
                        <h3 className="mb-2 text-xl font-black uppercase text-white">{item.head}</h3>
                        <p className="line-clamp-2 max-w-3xl font-sans text-sm leading-relaxed text-[#bbb] opacity-90">{stripHtml(item.paragrafs).substring(0, 180)}...</p>
                    </div>
                    <div className="flex w-full flex-row gap-2 md:w-auto md:flex-col">
                        <button type="button" onClick={onEdit} className="flex-1 border border-[#333] px-5 py-2 text-[10px] font-bold uppercase text-white transition-all hover:border-white md:w-28">Edit File</button>
                        <button type="button" onClick={onDelete} className="flex-1 border border-[#333] px-5 py-2 text-[10px] font-bold uppercase text-white transition-all hover:border-[#e60000] hover:bg-[#e60000] md:w-28">Delete</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProfileTabButton({ active, label, icon, onClick }: { active: boolean; label: string; icon?: ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-10 items-center gap-2 border px-3 font-mono text-[9px] font-black uppercase tracking-widest transition-all ${
                active ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#333] text-[#777] hover:border-[#e60000] hover:text-[#e60000]'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

function profileTitle(tab: 'about' | 'writings' | 'bookmarks' | 'following' | 'badges') {
    return {
        about: 'Profile Overview',
        writings: 'Personal Archives',
        bookmarks: 'Bookmarks',
        following: 'Following',
        badges: 'Badge Cabinet',
    }[tab];
}

function profileSubtitle(tab: 'about' | 'writings' | 'bookmarks' | 'following' | 'badges', writings: number, bookmarks: number, following: number, badges: number) {
    return {
        about: 'Identity, stats, and recent signal activity.',
        writings: `Managing ${writings} secure data entries within this sector.`,
        bookmarks: `${bookmarks} saved entries for later reading.`,
        following: `${following} followed archive officers.`,
        badges: `${badges} visible badge records.`,
    }[tab];
}

function AboutPanel({
    stats,
    user,
    recent,
}: {
    stats: { writings: number; drafts: number; up: number; comments: number; views: number };
    user: CurrentUser;
    recent: ContentItem[];
}) {
    return (
        <section className="space-y-6">
            <div className="grid gap-3 md:grid-cols-5">
                <ProfileMetric label="Writings" value={stats.writings} />
                <ProfileMetric label="Drafts" value={stats.drafts} danger={stats.drafts > 0} />
                <ProfileMetric label="Total UP" value={stats.up} />
                <ProfileMetric label="Comments" value={stats.comments} />
                <ProfileMetric label="Views" value={stats.views} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <div className="border border-[#2a2a2a] bg-[#181818] p-5">
                    <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">About</p>
                    <h3 className="m-0 mt-3 font-mono text-xl font-black uppercase text-white">{user.name}</h3>
                    <p className="m-0 mt-2 font-mono text-[10px] uppercase text-[#666]">{user.username ? `@${user.username}` : user.designation || 'Archive Officer'}</p>
                    {user.username && <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#444]">{user.designation || 'Archive Officer'}</p>}
                    <p className="m-0 mt-4 font-sans text-sm leading-7 text-[#aaa]">{user.moto || 'No personal note recorded yet.'}</p>
                </div>
                <div className="border border-[#2a2a2a] bg-[#181818] p-5">
                    <p className="m-0 mb-4 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Recent Activity</p>
                    {recent.length === 0 ? (
                        <div className="border border-dashed border-[#333] py-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[#444]">[ No Activity ]</div>
                    ) : (
                        <div className="space-y-3">
                            {recent.map((item) => (
                                <div key={item.idContent} className="border border-[#242424] bg-[#101010] p-3">
                                    <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{item.head}</p>
                                    <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{item.status === 'DRAFT' ? 'Draft saved' : 'Published'} // {formatDate(item.updatedAt || item.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function ProfileMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
    return (
        <div className="border border-[#2a2a2a] bg-[#181818] p-4">
            <p className="m-0 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[#555]">{label}</p>
            <p className={`m-0 mt-2 font-mono text-2xl font-black ${danger ? 'text-[#e60000]' : 'text-white'}`}>{value}</p>
        </div>
    );
}

function BadgesPanel({ badges, onOpen }: { badges: Badge[]; onOpen: (badge: Badge) => void }) {
    if (badges.length === 0) {
        return <div className="border border-dashed border-[#2a2a2a] py-20 text-center font-mono text-[#444]">[ NO BADGES ]</div>;
    }
    return (
        <div className="grid gap-3 md:grid-cols-2">
            {badges.map((badge) => (
                <button
                    key={badge.id ?? badge.code ?? badge.label}
                    type="button"
                    onClick={() => onOpen(badge)}
                    className="border border-[#2a2a2a] bg-[#181818] p-4 text-left transition-all hover:border-[#e60000]"
                >
                    <div className="mb-3 flex items-center gap-3">
                        <span className="text-2xl">{badge.custom ? badge.icon : '▣'}</span>
                        <div className="min-w-0">
                            <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{badge.label}</p>
                            <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{badge.custom ? 'Custom' : 'Core'} // {badge.automatic ? 'Auto' : 'Manual'}</p>
                        </div>
                    </div>
                    <p className="m-0 line-clamp-2 font-sans text-sm leading-6 text-[#aaa]">{badge.description}</p>
                </button>
            ))}
        </div>
    );
}

function BookmarkItem({ item, viewerUserId, onOpen }: { item: ContentItem; viewerUserId: string; onOpen: () => void }) {
    const navigate = useNavigate();
    const themeColor = getCategoryColor(item.kategori);
    return (
        <article
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            className="group border border-[#2a2a2a] bg-[#181818] p-6 text-left transition-all hover:border-[#e60000]"
            style={{ borderLeft: `3px solid ${themeColor}` }}
        >
            <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] font-bold" style={{ color: themeColor }}>SAVED ENTRY</span>
                <span className="border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor, borderColor: themeColor, backgroundColor: `${themeColor}15` }}>{item.kategori}</span>
                <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                        event.stopPropagation();
                        const path = profilePathForUser(item.user?.userID, viewerUserId);
                        if (path) navigate(path);
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        event.stopPropagation();
                        const path = profilePathForUser(item.user?.userID, viewerUserId);
                        if (path) navigate(path);
                    }}
                    className="font-mono text-[9px] uppercase text-[#555] hover:text-[#e60000]"
                >
                    {item.user?.name || 'Unknown'}
                </span>
            </div>
            <h3 className="mb-2 text-xl font-black uppercase text-white group-hover:text-[#e60000]">{item.head}</h3>
            <p className="line-clamp-2 font-sans text-sm leading-6 text-[#aaa]">{stripHtml(item.paragrafs).substring(0, 200)}...</p>
        </article>
    );
}

function FollowingItem({ target, onOpen }: { target: PublicUser; onOpen: () => void }) {
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(target.name || 'User')}`;
    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex items-center gap-4 border border-[#2a2a2a] bg-[#181818] p-4 text-left transition-all hover:border-[#e60000]"
        >
            <div className="h-14 w-14 overflow-hidden border border-[#333] bg-[#111]">
                <img
                    src={target.picture || defaultAvatar}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                />
            </div>
            <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{target.name || 'Unknown'}</p>
                <p className="m-0 mt-1 truncate font-mono text-[10px] uppercase text-[#666]">{target.designation || 'Archive Officer'}</p>
                <div className="mt-2">
                    <BadgeStrip badges={target.badges} compact />
                </div>
            </div>
        </button>
    );
}

function invalidateContentCaches(userId: string, contentId?: string) {
    invalidateApiCache('/content/all-content');
    invalidateApiCache(`/content/by-user/${userId}`);
    invalidateApiCache('/content/categories');
    invalidateApiCache('/content/analytics');
    if (contentId) {
        invalidateApiCache(`/content/${contentId}`);
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
            if (!context) {
                reject(new Error('Canvas unavailable'));
                return;
            }
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
        photoX: 68,
        photoY: 16,
        photoW: 22,
        photoH: 28,
        nameX: 36,
        nameY: 62,
        nameW: 50,
        nameH: 10,
        designationX: 36,
        designationY: 72,
        designationW: 50,
        designationH: 8,
        statsX: 5,
        statsY: 78,
        statsW: 30,
        statsH: 12,
        nameFontSize: 0.9,
        designationFontSize: 0.9,
        statsFontSize: 1.2,
        textColor: '#111111',
        accentColor: '#e60000',
    };
}

function formatDate(dateString?: string) {
    if (!dateString) return 'NO DATA';
    return formatIndonesiaDate(dateString);
}
