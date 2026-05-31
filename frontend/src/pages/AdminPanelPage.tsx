import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Award, Ban, CheckCircle2, HardDrive, Plus, RefreshCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import api, { invalidateApiCache } from '../lib/api';
import type { ActivityLogItem, Badge, BadgeCode, ContentItem, CurrentUser, MediaSmokeTestResult } from '../types/forum';
import AdminMessagePanel from '../components/AdminMessagePanel';
import BadgeStrip from '../components/BadgeStrip';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFeedback } from '../components/feedback';
import { profilePathForUser } from '../utils/profilePath';
import { formatIndonesiaDateTime } from '../utils/time';
import { Button as UiButton, Input, Modal, Panel, Select, StatChip } from '../components/ui';

const assignableBadges: BadgeCode[] = ['MODERATOR', 'WRITERS', 'MEDIA_TEC', 'CRIMINAL', 'SPEED', 'SMILE', 'REQUIEM'];
const customBadgeIcons = [
    '⭐', '🌟', '✨', '🔥', '⚡', '💎', '🎖️', '🏅', '🥇', '👑',
    '🛡️', '🗡️', '🧭', '🕯️', '🔦', '🔮', '🧪', '🧬', '🧠', '👁️',
    '📝', '📚', '📌', '🧷', '🗝️', '🔐', '📡', '🎙️', '🎧', '📷',
    '🎬', '🎨', '🧩', '🕹️', '🎲', '🎯', '🚀', '🛰️', '🌙', '☀️',
    '🌊', '🌋', '🌹', '🥀', '🍀', '🕊️', '💀', '👻', '😊', '🪽',
];

export default function AdminPanelPage({ user }: { user: CurrentUser }) {
    const navigate = useNavigate();
    const feedback = useFeedback();
    const [users, setUsers] = useState<CurrentUser[]>([]);
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [reports, setReports] = useState<ActivityLogItem[]>([]);
    const [customBadges, setCustomBadges] = useState<Badge[]>([]);
    const [suspendHours, setSuspendHours] = useState(24);
    const [selectedBadge, setSelectedBadge] = useState<BadgeCode>('WRITERS');
    const [selectedCustomBadge, setSelectedCustomBadge] = useState('');
    const [customBadgeForm, setCustomBadgeForm] = useState({ label: '', description: '', icon: customBadgeIcons[0] });
    const [userQuery, setUserQuery] = useState('');
    const [drawerUser, setDrawerUser] = useState<CurrentUser | null>(null);
    const [mediaSmoke, setMediaSmoke] = useState<MediaSmokeTestResult | null>(null);
    const [mediaSmokeBusy, setMediaSmokeBusy] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const [userResponse, contentResponse, reportResponse, customBadgeResponse] = await Promise.all([
                api.get<CurrentUser[]>('/api/admin/users'),
                api.get<ContentItem[]>('/content/all-content'),
                api.get<ActivityLogItem[]>('/api/logs/reports', { params: { limit: 50 } }),
                api.get<Badge[]>('/api/admin/custom-badges'),
            ]);
            setUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
            setContents(Array.isArray(contentResponse.data) ? contentResponse.data : []);
            setReports(Array.isArray(reportResponse.data) ? reportResponse.data : []);
            const custom = Array.isArray(customBadgeResponse.data) ? customBadgeResponse.data : [];
            setCustomBadges(custom);
            setSelectedCustomBadge(current => current || custom[0]?.id || '');
        } catch {
            setUsers([]);
            setContents([]);
            setReports([]);
            setCustomBadges([]);
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
        invalidateApiCache(`/api/user/${target.userID}`);
        await fetchUsers();
    };

    const deleteUser = async (target: CurrentUser) => {
        if (target.userID === user.userID) return;
        const accepted = await feedback.confirm({
            title: 'Delete Account',
            message: `Delete account ${target.email}?`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/users/${target.userID}`);
        invalidateApiCache(`/api/user/${target.userID}`);
        invalidateApiCache(`/content/by-user/${target.userID}`);
        await fetchUsers();
    };

    const grantBadge = async (target: CurrentUser) => {
        await api.post(`/api/admin/users/${target.userID}/badges/${selectedBadge}`);
        invalidateApiCache(`/api/user/${target.userID}`);
        await fetchUsers();
    };

    const revokeBadge = async (target: CurrentUser) => {
        await api.delete(`/api/admin/users/${target.userID}/badges/${selectedBadge}`);
        invalidateApiCache(`/api/user/${target.userID}`);
        await fetchUsers();
    };

    const createCustomBadge = async () => {
        if (!customBadgeForm.label.trim()) {
            feedback.toast('Nama custom badge wajib diisi.', 'error');
            return;
        }
        const response = await api.post<Badge>('/api/admin/custom-badges', customBadgeForm);
        setCustomBadges(current => [response.data, ...current]);
        setSelectedCustomBadge(response.data.id || '');
        setCustomBadgeForm({ label: '', description: '', icon: customBadgeIcons[0] });
        feedback.toast('Custom badge berhasil dibuat.', 'success');
    };

    const deleteCustomBadge = async (badge: Badge) => {
        if (!badge.id) return;
        const accepted = await feedback.confirm({
            title: 'Delete Custom Badge',
            message: `Hapus badge "${badge.label}" dari database dan semua user?`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/custom-badges/${badge.id}`);
        setCustomBadges(current => current.filter(item => item.id !== badge.id));
        setSelectedCustomBadge(current => current === badge.id ? '' : current);
        await fetchUsers();
    };

    const grantCustomBadge = async (target: CurrentUser) => {
        if (!selectedCustomBadge) {
            feedback.toast('Pilih custom badge dulu.', 'info');
            return;
        }
        await api.post(`/api/admin/users/${target.userID}/custom-badges/${selectedCustomBadge}`);
        invalidateApiCache(`/api/user/${target.userID}`);
        await fetchUsers();
    };

    const revokeCustomBadge = async (target: CurrentUser) => {
        if (!selectedCustomBadge) {
            feedback.toast('Pilih custom badge dulu.', 'info');
            return;
        }
        await api.delete(`/api/admin/users/${target.userID}/custom-badges/${selectedCustomBadge}`);
        invalidateApiCache(`/api/user/${target.userID}`);
        await fetchUsers();
    };

    const deleteContent = async (content: ContentItem) => {
        const accepted = await feedback.confirm({
            title: 'Delete Writing',
            message: `Delete writing "${content.head}"?`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/contents/${content.idContent}`);
        invalidateContentCaches(content);
        await fetchUsers();
    };

    const commentAsAdmin = async (content: ContentItem) => {
        const body = await feedback.prompt({
            title: 'Red Comment',
            message: `Komentar highlight merah untuk "${content.head}".`,
            placeholder: 'Tulis komentar admin...',
            confirmLabel: 'Publish',
            multiline: true,
            maxLength: 800,
        });
        if (!body) return;
        await api.post(`/content/${content.idContent}/comments`, { body });
        invalidateContentCaches(content);
        feedback.toast('Komentar admin highlight merah berhasil dikirim.', 'success');
    };

    const runMediaSmokeTest = async () => {
        setMediaSmokeBusy(true);
        try {
            const response = await api.post<MediaSmokeTestResult>('/api/admin/media/smoke-test');
            setMediaSmoke(response.data);
            feedback.toast(response.data.message, response.data.publicReadable ? 'success' : 'info');
        } catch (error) {
            feedback.toast(getAdminError(error), 'error');
        } finally {
            setMediaSmokeBusy(false);
        }
    };

    const resolveReport = async (report: ActivityLogItem) => {
        const response = await api.post<ActivityLogItem>(`/api/logs/reports/${report.id}/resolve`);
        setReports(current => current.map(item => item.id === report.id ? response.data : item));
    };

    const openReportTarget = (report: ActivityLogItem) => {
        if (report.contentId) {
            navigate(`/read/${report.contentId}`);
            return;
        }
        if (report.targetUserId) {
            navigate(`/profile/${report.targetUserId}`);
        }
    };

    const openReports = reports.filter(report => !report.resolved);
    const filteredUsers = users.filter(target => {
        const query = userQuery.trim().toLowerCase();
        if (!query) return true;
        return [target.name, target.email, target.designation, target.role]
            .some(value => (value || '').toLowerCase().includes(query));
    });
    const totalViews = contents.reduce((sum, item) => sum + (item.viewCount || 0), 0);
    const totalUp = contents.reduce((sum, item) => sum + (item.upCount || 0), 0);

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

            <AdminMessagePanel user={user} />

            <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <StatChip label="Users" value={users.length} />
                <StatChip label="Writings" value={contents.length} />
                <StatChip label="Open Reports" value={openReports.length} danger={openReports.length > 0} />
                <StatChip label="Total Views" value={totalViews} />
                <StatChip label="Total UP" value={totalUp} />
            </div>

            <Panel
                title="Media Storage Status"
                subtitle={mediaSmoke ? `${mediaSmoke.provider} // ${mediaSmoke.publicReadable ? 'public readable' : 'needs review'}` : 'R2 smoke test standby'}
                action={(
                    <UiButton onClick={() => void runMediaSmokeTest()} disabled={mediaSmokeBusy} variant="danger">
                        <HardDrive size={13} />
                        {mediaSmokeBusy ? 'Testing' : 'Smoke Test'}
                    </UiButton>
                )}
                className="mb-8"
            >
                {mediaSmoke ? (
                    <div className="grid gap-2 font-mono text-[10px] uppercase text-[#777]">
                        <p className="m-0"><span className="text-[#e60000]">Provider:</span> {mediaSmoke.provider}</p>
                        <p className="m-0"><span className="text-[#e60000]">Public:</span> {mediaSmoke.publicReadable ? 'Readable' : 'Not readable'}</p>
                        <p className="m-0 break-all"><span className="text-[#e60000]">Key:</span> {mediaSmoke.storageKey}</p>
                        <a className="break-all text-[#aaa] hover:text-white" href={mediaSmoke.url} target="_blank" rel="noreferrer">
                            {mediaSmoke.url}
                        </a>
                    </div>
                ) : (
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#444]">[ Media pipeline belum dites di sesi ini ]</div>
                )}
            </Panel>

            <section className="mb-8 border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-5 flex flex-col gap-4 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[#e60000]">
                            <AlertTriangle size={16} />
                            <span className="font-mono text-[10px] font-black uppercase tracking-[0.35em]">Moderation Center</span>
                        </div>
                        <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Report Queue</h2>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">{openReports.length} open case // {reports.length} total signal</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/logs?tab=reports')}
                        className="h-9 border border-[#333] px-4 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]"
                    >
                        Open Ledger
                    </button>
                </div>

                {openReports.length === 0 ? (
                    <div className="py-10 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ Queue Clear ]</div>
                ) : (
                    <div className="grid gap-3">
                        {openReports.slice(0, 6).map((report) => (
                            <div key={report.id} className="flex flex-col gap-3 border border-[#242424] bg-[#101010] p-4 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="border border-[#e60000]/50 px-2 py-0.5 font-mono text-[8px] font-black uppercase text-[#e60000]">{report.targetType}</span>
                                        <span className="border border-[#333] px-2 py-0.5 font-mono text-[8px] font-black uppercase text-[#777]">{report.reportCategory || 'OTHER'}</span>
                                        <span className="font-mono text-[9px] uppercase text-[#555]">{formatDate(report.createdAt ?? '')}</span>
                                    </div>
                                    <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{report.title}</p>
                                    <p className="m-0 mt-1 line-clamp-2 text-sm leading-6 text-[#999]">{report.reason || report.message}</p>
                                    <p className="m-0 mt-2 flex flex-wrap gap-2 font-mono text-[9px] uppercase text-[#555]">
                                        <ProfileTextButton
                                            label={`Reporter: ${report.actorName || 'Unknown'}`}
                                            userId={report.actorUserId}
                                            viewerUserId={user.userID}
                                            onNavigate={navigate}
                                        />
                                        <span>//</span>
                                        <ProfileTextButton
                                            label={`Target: ${report.targetUserName || report.contentTitle || 'Unknown'}`}
                                            userId={report.targetUserId}
                                            viewerUserId={user.userID}
                                            onNavigate={navigate}
                                        />
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openReportTarget(report)}
                                        className="h-9 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-white hover:text-white"
                                    >
                                        Review
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void resolveReport(report)}
                                        className="flex h-9 items-center gap-2 border border-[#166534] px-3 font-mono text-[10px] font-black uppercase text-[#4ade80] hover:bg-[#166534] hover:text-white"
                                    >
                                        <CheckCircle2 size={13} />
                                        Resolve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <Panel
                title="Custom Badge Forge"
                subtitle="Badge kosmetik admin-only // tanpa efek fungsional"
                className="mb-8"
                action={(
                    <UiButton onClick={() => void createCustomBadge()} variant="danger">
                        <Plus size={13} />
                        Create Badge
                    </UiButton>
                )}
            >
                <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                    <div className="space-y-3">
                        <Input
                            value={customBadgeForm.label}
                            onChange={(event) => setCustomBadgeForm(current => ({ ...current, label: event.target.value }))}
                            placeholder="Badge name..."
                            maxLength={32}
                        />
                        <Input
                            value={customBadgeForm.description}
                            onChange={(event) => setCustomBadgeForm(current => ({ ...current, description: event.target.value }))}
                            placeholder="Badge description..."
                            maxLength={180}
                        />
                        <div className="grid max-h-44 grid-cols-10 gap-1 overflow-y-auto border border-[#242424] bg-[#101010] p-2">
                            {customBadgeIcons.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setCustomBadgeForm(current => ({ ...current, icon }))}
                                    className={`h-8 border font-mono text-base transition-all ${customBadgeForm.icon === icon ? 'border-[#e60000] bg-[#e60000]' : 'border-[#333] hover:border-white'}`}
                                    title={icon}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        {customBadges.length === 0 ? (
                            <div className="border border-dashed border-[#2a2a2a] py-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Custom Badge ]</div>
                        ) : (
                            customBadges.map((badge) => (
                                <div key={badge.id ?? badge.label} className="flex flex-col gap-3 border border-[#242424] bg-[#101010] p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{badge.icon}</span>
                                            <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{badge.label}</p>
                                        </div>
                                        <p className="m-0 mt-1 line-clamp-2 text-sm text-[#888]">{badge.description || 'No description'}</p>
                                    </div>
                                    <UiButton onClick={() => void deleteCustomBadge(badge)} variant="danger">
                                        <Trash2 size={13} />
                                        Delete
                                    </UiButton>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Panel>

            <section className="border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-5 flex flex-col gap-4 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">User Control</h2>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">Temporary suspend and account removal</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-9 items-center gap-2 border border-[#333] bg-[#101010] px-3">
                            <Search size={13} className="text-[#777]" />
                            <input
                                value={userQuery}
                                onChange={(event) => setUserQuery(event.target.value)}
                                placeholder="Search user..."
                                className="w-40 bg-transparent font-mono text-[10px] uppercase text-white outline-none placeholder:text-[#555]"
                            />
                        </div>
                        <Select
                            value={selectedBadge}
                            onChange={(event) => setSelectedBadge(event.target.value as BadgeCode)}
                            title="Badge target"
                        >
                            {assignableBadges.map((badge) => (
                                <option key={badge} value={badge}>{badge}</option>
                            ))}
                        </Select>
                        <Select
                            value={selectedCustomBadge}
                            onChange={(event) => setSelectedCustomBadge(event.target.value)}
                            title="Custom badge target"
                        >
                            <option value="">CUSTOM_BADGE</option>
                            {customBadges.map((badge) => (
                                <option key={badge.id ?? badge.label} value={badge.id}>{badge.icon} {badge.label}</option>
                            ))}
                        </Select>
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
                    <LoadingSpinner compact label="Syncing Users" />
                ) : filteredUsers.length === 0 ? (
                    <div className="py-16 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Users ]</div>
                ) : (
                    <div className="grid gap-3">
                        {filteredUsers.map((target) => {
                            const isSelf = target.userID === user.userID;
                            const isAdmin = target.role === 'ADMIN';
                            return (
                                <div key={target.userID} className="flex flex-col gap-4 border border-[#242424] bg-[#101010] p-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => navigate(profilePathForUser(target.userID, user.userID) ?? '/')}
                                                className="m-0 truncate font-mono text-sm font-black uppercase text-white hover:text-[#e60000]"
                                            >
                                                {target.name}
                                            </button>
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
                                        <div className="mt-2">
                                            <BadgeStrip badges={target.badges} compact />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void grantBadge(target)}
                                            className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#22c55e] hover:text-[#22c55e]"
                                        >
                                            Badge+
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void revokeBadge(target)}
                                            className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]"
                                        >
                                            Badge-
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDrawerUser(target)}
                                            className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]"
                                        >
                                            <Award size={13} />
                                            Actions
                                        </button>
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

            <section className="mt-8 border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-5 border-b border-[#2a2a2a] pb-4">
                    <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Writing Control</h2>
                    <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">Delete user writing or publish red-highlight admin comment</p>
                </div>
                <div className="grid gap-3">
                    {contents.map((content) => (
                        <div key={content.idContent} className="flex flex-col gap-3 border border-[#242424] bg-[#101010] p-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                                <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{content.head}</p>
                                <p className="m-0 mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-[#666]">
                                    <ProfileTextButton
                                        label={content.user?.name || 'Unknown'}
                                        userId={content.user?.userID}
                                        viewerUserId={user.userID}
                                        onNavigate={navigate}
                                    />
                                    <span>// {content.kategori}</span>
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => void commentAsAdmin(content)}
                                    className="h-9 border border-[#e60000] px-3 font-mono text-[10px] font-black uppercase text-[#e60000] hover:bg-[#e60000] hover:text-white"
                                >
                                    Red Comment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void deleteContent(content)}
                                    className="flex h-9 items-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:bg-[#e60000] hover:text-white"
                                >
                                    <Trash2 size={13} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {drawerUser && (
                <Modal
                    title="Quick Action Drawer"
                    onClose={() => setDrawerUser(null)}
                    footer={(
                        <>
                            <UiButton onClick={() => navigate(profilePathForUser(drawerUser.userID, user.userID) ?? '/')}>View Profile</UiButton>
                            <UiButton onClick={() => void suspendUser(drawerUser)} disabled={drawerUser.role === 'ADMIN'} variant="danger">Suspend</UiButton>
                            <UiButton onClick={() => void deleteUser(drawerUser)} disabled={drawerUser.userID === user.userID} variant="danger">Delete User</UiButton>
                        </>
                    )}
                >
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 border border-[#242424] bg-[#101010] p-4">
                            <img
                                src={drawerUser.picture || `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(drawerUser.name || 'User')}`}
                                alt=""
                                className="h-14 w-14 border border-[#333] object-cover"
                                referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                                <p className="m-0 truncate font-mono text-lg font-black uppercase text-white">{drawerUser.name}</p>
                                <p className="m-0 mt-1 truncate font-mono text-[10px] uppercase text-[#666]">{drawerUser.email}</p>
                                <div className="mt-2"><BadgeStrip badges={drawerUser.badges} compact /></div>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="border border-[#242424] bg-[#101010] p-4">
                                <p className="m-0 mb-3 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">Core Badge</p>
                                <div className="flex flex-wrap gap-2">
                                    <UiButton onClick={() => void grantBadge(drawerUser)} variant="success">Grant {selectedBadge}</UiButton>
                                    <UiButton onClick={() => void revokeBadge(drawerUser)} variant="danger">Revoke {selectedBadge}</UiButton>
                                </div>
                            </div>
                            <div className="border border-[#242424] bg-[#101010] p-4">
                                <p className="m-0 mb-3 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">Custom Badge</p>
                                <div className="flex flex-wrap gap-2">
                                    <UiButton onClick={() => void grantCustomBadge(drawerUser)} disabled={!selectedCustomBadge} variant="success">Grant Custom</UiButton>
                                    <UiButton onClick={() => void revokeCustomBadge(drawerUser)} disabled={!selectedCustomBadge} variant="danger">Revoke Custom</UiButton>
                                </div>
                            </div>
                        </div>
                        <div className="border border-[#242424] bg-[#101010] p-4 font-mono text-[10px] uppercase text-[#777]">
                            <p className="m-0">Role: {drawerUser.role}</p>
                            <p className="m-0 mt-1">Suspend: {drawerUser.suspendedUntil ? formatDate(drawerUser.suspendedUntil) : 'ACTIVE'}</p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function formatDate(dateString: string) {
    if (!dateString) return 'NO_DATE';
    return formatIndonesiaDateTime(dateString);
}

function invalidateContentCaches(content: ContentItem) {
    invalidateApiCache('/content/all-content');
    invalidateApiCache('/content/feed');
    invalidateApiCache('/content/analytics');
    invalidateApiCache('/content/categories');
    invalidateApiCache(`/content/${content.idContent}`);
    invalidateApiCache(`/content/${content.idContent}/comments`);
    if (content.user?.userID) {
        invalidateApiCache(`/content/by-user/${content.user.userID}`);
    }
}

function ProfileTextButton({
    label,
    userId,
    viewerUserId,
    onNavigate,
}: {
    label: string;
    userId?: string;
    viewerUserId: string;
    onNavigate: (path: string) => void;
}) {
    const path = profilePathForUser(userId, viewerUserId);
    if (!path) {
        return <span>{label}</span>;
    }
    return (
        <button
            type="button"
            onClick={() => onNavigate(path)}
            className="font-mono uppercase text-[#777] hover:text-[#e60000]"
        >
            {label}
        </button>
    );
}

function getAdminError(error: unknown) {
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
    return 'Admin request gagal diproses.';
}
