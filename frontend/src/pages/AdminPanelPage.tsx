import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Award, Ban, CheckCircle2, HardDrive, ImagePlus, Plus, RefreshCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import api, { invalidateApiCache, isRequestCanceled } from '../lib/api';
import type { ActivityLogItem, Badge, BadgeCode, ContentItem, CurrentUser, MediaSmokeTestResult } from '../types/forum';
import AdminMessagePanel from '../components/AdminMessagePanel';
import BadgeStrip from '../components/BadgeStrip';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFeedback } from '../components/feedback';
import { profilePathForUser } from '../utils/profilePath';
import { formatIndonesiaDateTime } from '../utils/time';
import { Button as UiButton, Input, Modal, Panel, Select, StatChip } from '../components/ui';
import type { GenreItem, ProfileCardItem, ProfileCardLayout } from '../types/forum';

const assignableBadges: BadgeCode[] = ['MODERATOR', 'WRITERS', 'MEDIA_TEC', 'CRIMINAL', 'SPEED', 'SMILE', 'REQUIEM'];
const genrePalette = [
    '#e60000', '#ffffff', '#111827', '#3b82f6', '#38bdf8', '#22c55e', '#4ade80', '#eab308',
    '#f97316', '#ec4899', '#a855f7', '#8b5cf6', '#14b8a6', '#06b6d4', '#f43f5e', '#64748b',
    '#f8fafc', '#fde047', '#fb7185', '#c084fc', '#60a5fa', '#34d399', '#facc15', '#fb923c',
    '#991b1b', '#1d4ed8', '#166534', '#854d0e', '#581c87', '#0f172a',
];

type EmailDomainItem = {
    id: string;
    domain: string;
    createdAt?: string;
};

export default function AdminPanelPage({ user }: { user: CurrentUser }) {
    const navigate = useNavigate();
    const feedback = useFeedback();
    const [users, setUsers] = useState<CurrentUser[]>([]);
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [reports, setReports] = useState<ActivityLogItem[]>([]);
    const [customBadges, setCustomBadges] = useState<Badge[]>([]);
    const [emailDomains, setEmailDomains] = useState<EmailDomainItem[]>([]);
    const [emailDomainInput, setEmailDomainInput] = useState('');
    const [genres, setGenres] = useState<GenreItem[]>([]);
    const [genreForm, setGenreForm] = useState({ name: '', color: '#e60000', editingId: '' });
    const [profileCardTemplates, setProfileCardTemplates] = useState<ProfileCardItem[]>([]);
    const [selectedProfileCardTemplate, setSelectedProfileCardTemplate] = useState('');
    const [cardForm, setCardForm] = useState<ProfileCardFormState>(initialProfileCardForm());
    const [suspendHours, setSuspendHours] = useState(24);
    const [selectedBadge, setSelectedBadge] = useState<BadgeCode>('WRITERS');
    const [selectedCustomBadge, setSelectedCustomBadge] = useState('');
    const [customBadgeForm, setCustomBadgeForm] = useState({ editingId: '', label: '', description: '', image: '' });
    const [userQuery, setUserQuery] = useState('');
    const [drawerUser, setDrawerUser] = useState<CurrentUser | null>(null);
    const [mediaSmoke, setMediaSmoke] = useState<MediaSmokeTestResult | null>(null);
    const [mediaSmokeBusy, setMediaSmokeBusy] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const [userResponse, contentResponse, reportResponse, customBadgeResponse, genreResponse, cardTemplateResponse, emailDomainResponse] = await Promise.all([
                api.get<CurrentUser[]>('/api/admin/users', { signal }),
                api.get<ContentItem[]>('/content/all-content', { signal }),
                api.get<ActivityLogItem[]>('/api/logs/reports', { signal, params: { limit: 50 } }),
                api.get<Badge[]>('/api/admin/custom-badges', { signal }),
                api.get<GenreItem[]>('/api/admin/genres', { signal }),
                api.get<ProfileCardItem[]>('/api/admin/profile-card-templates', { signal }),
                api.get<EmailDomainItem[]>('/api/admin/email-domains', { signal }),
            ]);
            setUsers(Array.isArray(userResponse.data) ? userResponse.data : []);
            setContents(Array.isArray(contentResponse.data) ? contentResponse.data : []);
            setReports(Array.isArray(reportResponse.data) ? reportResponse.data : []);
            const custom = Array.isArray(customBadgeResponse.data) ? customBadgeResponse.data : [];
            setCustomBadges(custom);
            const grantableCustom = custom.filter(badge => badge.custom && badge.id);
            setSelectedCustomBadge(current => current || grantableCustom[0]?.id || '');
            setGenres(Array.isArray(genreResponse.data) ? genreResponse.data : []);
            const templates = Array.isArray(cardTemplateResponse.data) ? cardTemplateResponse.data : [];
            setProfileCardTemplates(templates);
            setSelectedProfileCardTemplate(current => current || templates[0]?.id || '');
            setEmailDomains(Array.isArray(emailDomainResponse.data) ? emailDomainResponse.data : []);
        } catch (error) {
            if (!isRequestCanceled(error)) {
                setUsers([]);
                setContents([]);
                setReports([]);
                setCustomBadges([]);
                setGenres([]);
                setProfileCardTemplates([]);
                setEmailDomains([]);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void fetchUsers(controller.signal);
        return () => controller.abort();
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

    const saveCustomBadge = async () => {
        if (!customBadgeForm.label.trim()) {
            feedback.toast('Nama badge wajib diisi.', 'error');
            return;
        }
        if (!customBadgeForm.editingId && !customBadgeForm.image) {
            feedback.toast('Upload PNG transparan 1:1 untuk badge baru.', 'error');
            return;
        }
        const payload = {
            label: customBadgeForm.label,
            description: customBadgeForm.description,
            image: customBadgeForm.image || undefined,
        };
        const response = customBadgeForm.editingId
            ? await api.post<Badge>(`/api/admin/custom-badges/${customBadgeForm.editingId}`, payload)
            : await api.post<Badge>('/api/admin/custom-badges', payload);
        setCustomBadges(current => {
            const without = current.filter(item => item.id !== response.data.id);
            return [response.data, ...without];
        });
        if (response.data.custom) {
            setSelectedCustomBadge(response.data.id || '');
        }
        setCustomBadgeForm({ editingId: '', label: '', description: '', image: '' });
        feedback.toast(customBadgeForm.editingId ? 'Badge berhasil diupdate.' : 'Custom badge berhasil dibuat.', 'success');
    };

    const editCustomBadge = (badge: Badge) => {
        setCustomBadgeForm({
            editingId: badge.id || '',
            label: badge.label,
            description: badge.description || '',
            image: badge.image || '',
        });
    };

    const deleteCustomBadge = async (badge: Badge) => {
        if (!badge.id) return;
        if (!badge.custom || badge.code) {
            feedback.toast('Core badge hanya bisa diedit, bukan dihapus.', 'info');
            return;
        }
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

    const createEmailDomain = async () => {
        if (!emailDomainInput.trim()) {
            feedback.toast('Domain email wajib diisi.', 'error');
            return;
        }
        const response = await api.post<EmailDomainItem>('/api/admin/email-domains', { domain: emailDomainInput });
        setEmailDomains(current => [...current, response.data].sort((a, b) => a.domain.localeCompare(b.domain)));
        setEmailDomainInput('');
        feedback.toast('Domain email custom tersimpan.', 'success');
    };

    const deleteEmailDomain = async (domain: EmailDomainItem) => {
        const accepted = await feedback.confirm({
            title: 'Delete Email Domain',
            message: `Hapus domain ${domain.domain} dari registry?`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/email-domains/${domain.id}`);
        setEmailDomains(current => current.filter(item => item.id !== domain.id));
    };

    const saveGenre = async () => {
        if (!genreForm.name.trim()) {
            feedback.toast('Nama genre wajib diisi.', 'error');
            return;
        }
        if (genreForm.editingId) {
            const response = await api.post<GenreItem>(`/api/admin/genres/${genreForm.editingId}`, { name: genreForm.name, color: genreForm.color });
            setGenres(current => current.map(item => item.id === response.data.id ? response.data : item));
        } else {
            const response = await api.post<GenreItem>('/api/admin/genres', { name: genreForm.name, color: genreForm.color });
            setGenres(current => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
        }
        invalidateApiCache('/content/categories');
        invalidateApiCache('/content/genre-definitions');
        setGenreForm({ name: '', color: '#e60000', editingId: '' });
        feedback.toast('Genre berhasil disimpan.', 'success');
    };

    const deleteGenre = async (genre: GenreItem) => {
        const accepted = await feedback.confirm({
            title: 'Delete Genre',
            message: `Hapus genre "${genre.name}"? Tulisan lama tetap punya labelnya, tapi genre tidak lagi tampil sebagai pilihan admin.`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/genres/${genre.id}`);
        setGenres(current => current.filter(item => item.id !== genre.id));
        invalidateApiCache('/content/categories');
        invalidateApiCache('/content/genre-definitions');
    };

    const saveProfileCardTemplate = async () => {
        if (!cardForm.name.trim() || !cardForm.backgroundImage) {
            feedback.toast('Nama dan background card wajib ada.', 'error');
            return;
        }
        const payload = {
            name: cardForm.name,
            description: cardForm.description,
            backgroundImage: cardForm.backgroundImage,
            orientation: cardForm.orientation,
            layout: cardForm.layout,
        };
        const response = cardForm.editingId
            ? await api.post<ProfileCardItem>(`/api/admin/profile-card-templates/${cardForm.editingId}`, payload)
            : await api.post<ProfileCardItem>('/api/admin/profile-card-templates', payload);
        setProfileCardTemplates(current => {
            const without = current.filter(item => item.id !== response.data.id);
            return [response.data, ...without];
        });
        setSelectedProfileCardTemplate(response.data.id);
        setCardForm(initialProfileCardForm());
        feedback.toast('Template profile card tersimpan.', 'success');
    };

    const editProfileCardTemplate = (template: ProfileCardItem) => {
        setCardForm({
            editingId: template.id,
            name: template.name,
            description: template.description || '',
            backgroundImage: template.backgroundImage || '',
            orientation: template.orientation === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL',
            layout: template.layout,
        });
        setSelectedProfileCardTemplate(template.id);
    };

    const deleteProfileCardTemplate = async (template: ProfileCardItem) => {
        const accepted = await feedback.confirm({
            title: 'Delete Profile Card Template',
            message: `Hapus template "${template.name}"? Card yang sudah diberikan ke user tetap aman sebagai snapshot.`,
            confirmLabel: 'Delete',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/admin/profile-card-templates/${template.id}`);
        setProfileCardTemplates(current => current.filter(item => item.id !== template.id));
    };

    const grantProfileCard = async (target: CurrentUser) => {
        if (!selectedProfileCardTemplate) {
            feedback.toast('Pilih template profile card dulu.', 'info');
            return;
        }
        await api.post(`/api/admin/users/${target.userID}/profile-cards/${selectedProfileCardTemplate}`);
        invalidateApiCache(`/api/user/${target.userID}`);
        feedback.toast('Profile card berhasil diberikan dan masuk notifikasi user.', 'success');
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

    const rejectReport = async (report: ActivityLogItem) => {
        const accepted = await feedback.confirm({
            title: 'Reject Report',
            message: 'Report akan dihapus permanen dari queue dan tidak bisa diakses lagi.',
            confirmLabel: 'Reject',
            danger: true,
        });
        if (!accepted) return;
        await api.delete(`/api/logs/reports/${report.id}`);
        setReports(current => current.filter(item => item.id !== report.id));
        feedback.toast('Report direject dan dihapus permanen.', 'success');
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
        return [target.name, target.username, target.email, target.designation, target.role]
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

            <Panel
                title="Email Domain Registry"
                subtitle="Trusted custom domains // does not lock existing users"
                className="mb-8"
                action={<UiButton onClick={() => void createEmailDomain()} variant="danger">Add Domain</UiButton>}
            >
                <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <div className="space-y-3">
                        <Input
                            id="admin-email-domain"
                            name="adminEmailDomain"
                            aria-label="Custom email domain"
                            value={emailDomainInput}
                            onChange={(event) => setEmailDomainInput(event.target.value)}
                            placeholder="example.com"
                            maxLength={120}
                        />
                        <p className="m-0 font-mono text-[9px] uppercase leading-5 text-[#666]">
                            Domain disimpan sebagai registry trusted. Aku tidak membuatnya jadi whitelist pemblokir agar akun lama dan Google login tidak terkunci.
                        </p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                        {emailDomains.length === 0 ? (
                            <div className="border border-dashed border-[#2a2a2a] py-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444] md:col-span-2">[ No Custom Domain ]</div>
                        ) : emailDomains.map((domain) => (
                            <div key={domain.id} className="flex items-center justify-between gap-3 border border-[#242424] bg-[#101010] p-3">
                                <div className="min-w-0">
                                    <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">@{domain.domain}</p>
                                    <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{domain.createdAt ? formatDate(domain.createdAt) : 'NO_DATE'}</p>
                                </div>
                                <UiButton onClick={() => void deleteEmailDomain(domain)} variant="danger">Delete</UiButton>
                            </div>
                        ))}
                    </div>
                </div>
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
                                    {user.role === 'ADMIN' && (
                                        <button
                                            type="button"
                                            onClick={() => void rejectReport(report)}
                                            className="flex h-9 items-center gap-2 border border-[#7f1d1d] px-3 font-mono text-[10px] font-black uppercase text-[#ff5555] hover:bg-[#7f1d1d] hover:text-white"
                                        >
                                            <Trash2 size={13} />
                                            Reject
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <Panel
                title="Badge Library"
                subtitle="Core badge kosmetik + custom badge upload PNG transparan"
                className="mb-8"
                action={(
                    <UiButton onClick={() => void saveCustomBadge()} variant="danger">
                        <Plus size={13} />
                        {customBadgeForm.editingId ? 'Save Badge' : 'Create Badge'}
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
                        <input
                            id="admin-custom-badge-image"
                            name="customBadgeImage"
                            aria-label="Custom badge transparent PNG"
                            type="file"
                            accept="image/png"
                            className="hidden"
                            onChange={(event) => {
                                void readBadgeImage(event.target.files?.[0])
                                    .then((image) => {
                                        if (image) {
                                            setCustomBadgeForm(current => ({ ...current, image }));
                                        }
                                    })
                                    .catch((error) => feedback.toast(error instanceof Error ? error.message : 'Badge image rejected.', 'error'));
                                event.currentTarget.value = '';
                            }}
                        />
                        <label htmlFor="admin-custom-badge-image" className="flex h-11 cursor-pointer items-center justify-center gap-2 border border-[#333] font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]">
                            <ImagePlus size={14} />
                            Upload 1:1 Transparent PNG
                        </label>
                        {customBadgeForm.image && (
                            <div className="flex items-center gap-3 border border-[#242424] bg-[#101010] p-3">
                                <img src={customBadgeForm.image} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                                <p className="m-0 font-mono text-[10px] uppercase text-[#777]">Compressed badge preview</p>
                            </div>
                        )}
                        {customBadgeForm.editingId && (
                            <UiButton onClick={() => setCustomBadgeForm({ editingId: '', label: '', description: '', image: '' })}>
                                Cancel Edit
                            </UiButton>
                        )}
                    </div>
                    <div className="grid gap-2">
                        {customBadges.length === 0 ? (
                            <div className="border border-dashed border-[#2a2a2a] py-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Custom Badge ]</div>
                        ) : (
                            customBadges.map((badge) => (
                                <div key={badge.id ?? badge.label} className="flex flex-col gap-3 border border-[#242424] bg-[#101010] p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            {badge.image ? <img src={badge.image} alt="" width={24} height={24} className="h-6 w-6 object-contain" /> : <span className="text-lg">{badge.icon}</span>}
                                            <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{badge.label}</p>
                                            {badge.code && <span className="border border-[#333] px-2 py-0.5 font-mono text-[8px] uppercase text-[#777]">Core</span>}
                                        </div>
                                        <p className="m-0 mt-1 line-clamp-2 text-sm text-[#888]">{badge.description || 'No description'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <UiButton onClick={() => editCustomBadge(badge)}>Edit</UiButton>
                                        <UiButton onClick={() => void deleteCustomBadge(badge)} disabled={!badge.custom || Boolean(badge.code)} variant="danger">
                                            <Trash2 size={13} />
                                            Delete
                                        </UiButton>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Panel>

            <Panel
                title="Genre Protocol"
                subtitle="Tambah, hapus, dan atur warna genre tulisan"
                className="mb-8"
                action={<UiButton onClick={() => void saveGenre()} variant="danger">{genreForm.editingId ? 'Update Genre' : 'Create Genre'}</UiButton>}
            >
                <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
                    <div className="space-y-3">
                        <Input
                            id="admin-genre-name"
                            name="genreName"
                            aria-label="Genre name"
                            value={genreForm.name}
                            onChange={(event) => setGenreForm(current => ({ ...current, name: event.target.value }))}
                            placeholder="Genre name..."
                            maxLength={60}
                        />
                        <div className="flex gap-2">
                            <input
                                id="admin-genre-color-picker"
                                name="genreColorPicker"
                                aria-label="Genre color picker"
                                type="color"
                                value={genreForm.color}
                                onChange={(event) => setGenreForm(current => ({ ...current, color: event.target.value }))}
                                className="h-10 w-16 border border-[#333] bg-[#101010]"
                                title="Genre color"
                            />
                            <Input
                                id="admin-genre-color"
                                name="genreColor"
                                aria-label="Genre color hex"
                                value={genreForm.color}
                                onChange={(event) => setGenreForm(current => ({ ...current, color: event.target.value }))}
                                placeholder="#e60000"
                            />
                        </div>
                        <div className="grid grid-cols-10 gap-1 border border-[#242424] bg-[#101010] p-2">
                            {genrePalette.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setGenreForm(current => ({ ...current, color }))}
                                    className={`h-7 border ${genreForm.color === color ? 'border-white' : 'border-[#333]'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                        {genres.length === 0 ? (
                            <div className="border border-dashed border-[#2a2a2a] py-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444] md:col-span-2">[ No Custom Genre ]</div>
                        ) : genres.map((genre) => (
                            <div key={genre.id} className="flex items-center justify-between gap-3 border border-[#242424] bg-[#101010] p-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="h-4 w-4 border border-[#333]" style={{ backgroundColor: genre.color }} />
                                        <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{genre.name}</p>
                                    </div>
                                    <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{genre.color}</p>
                                </div>
                                <div className="flex gap-2">
                                    <UiButton onClick={() => setGenreForm({ name: genre.name, color: genre.color, editingId: genre.id })}>Edit</UiButton>
                                    <UiButton onClick={() => void deleteGenre(genre)} variant="danger">Delete</UiButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Panel>

            <Panel
                title="Profile Card Lab"
                subtitle="Template admin-only; saat diberikan ke user berubah menjadi snapshot hadiah"
                className="mb-8"
                action={<UiButton onClick={() => void saveProfileCardTemplate()} variant="danger">{cardForm.editingId ? 'Update Template' : 'Create Template'}</UiButton>}
            >
                <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
                    <div className="space-y-3">
                        <Input id="admin-card-template-name" name="cardTemplateName" aria-label="Card template name" value={cardForm.name} onChange={(event) => setCardForm(current => ({ ...current, name: event.target.value }))} placeholder="Card template name..." />
                        <Input id="admin-card-template-description" name="cardTemplateDescription" aria-label="Card template description" value={cardForm.description} onChange={(event) => setCardForm(current => ({ ...current, description: event.target.value }))} placeholder="Description..." />
                        <Select id="admin-card-orientation" name="cardOrientation" aria-label="Card orientation" value={cardForm.orientation} onChange={(event) => setCardForm(current => ({ ...current, orientation: event.target.value as 'HORIZONTAL' | 'VERTICAL' }))}>
                            <option value="HORIZONTAL">Horizontal</option>
                            <option value="VERTICAL">Vertical</option>
                        </Select>
                        <input
                            id="profileCardBackground"
                            name="profileCardBackground"
                            aria-label="Profile card background image"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => {
                                void readCardImage(event.target.files?.[0]).then((backgroundImage) => {
                                    if (backgroundImage) setCardForm(current => ({ ...current, backgroundImage }));
                                });
                                event.currentTarget.value = '';
                            }}
                        />
                        <label htmlFor="profileCardBackground" className="flex h-10 cursor-pointer items-center justify-center border border-[#333] font-mono text-[10px] font-black uppercase text-[#777] hover:border-[#e60000] hover:text-[#e60000]">
                            Upload Compressed Background
                        </label>
                        <LayoutEditor layout={cardForm.layout} onChange={(layout) => setCardForm(current => ({ ...current, layout }))} />
                    </div>
                    <div className="space-y-4">
                        <div className={`relative overflow-hidden border border-[#333] bg-[#050505] ${cardForm.orientation === 'VERTICAL' ? 'aspect-[0.64/1] max-w-[320px]' : 'aspect-[1.58/1] max-w-[620px]'}`}>
                            {cardForm.backgroundImage ? <img src={cardForm.backgroundImage} alt="" width={620} height={392} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#333]">[ Upload Background ]</div>}
                            <TemplateOverlay layout={cardForm.layout} />
                        </div>
                        <div className="grid gap-2">
                            {profileCardTemplates.length === 0 ? (
                                <div className="border border-dashed border-[#2a2a2a] py-12 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#444]">[ No Template ]</div>
                            ) : profileCardTemplates.map(template => (
                                <div key={template.id} className="flex flex-col gap-3 border border-[#242424] bg-[#101010] p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <p className="m-0 truncate font-mono text-sm font-black uppercase text-white">{template.name}</p>
                                        <p className="m-0 mt-1 font-mono text-[9px] uppercase text-[#666]">{template.orientation} // {template.description || 'No description'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <UiButton onClick={() => editProfileCardTemplate(template)}>Edit</UiButton>
                                        <UiButton onClick={() => setSelectedProfileCardTemplate(template.id)} variant={selectedProfileCardTemplate === template.id ? 'primary' : 'ghost'}>Select Gift</UiButton>
                                        <UiButton onClick={() => void deleteProfileCardTemplate(template)} variant="danger">Delete</UiButton>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                id="admin-user-search"
                                name="adminUserSearch"
                                aria-label="Search user"
                                value={userQuery}
                                onChange={(event) => setUserQuery(event.target.value)}
                                placeholder="Search user..."
                                className="w-40 bg-transparent font-mono text-[10px] uppercase text-white outline-none placeholder:text-[#555]"
                            />
                        </div>
                        <Select
                            id="admin-badge-target"
                            name="adminBadgeTarget"
                            aria-label="Core badge target"
                            value={selectedBadge}
                            onChange={(event) => setSelectedBadge(event.target.value as BadgeCode)}
                            title="Badge target"
                        >
                            {assignableBadges.map((badge) => (
                                <option key={badge} value={badge}>{badge}</option>
                            ))}
                        </Select>
                        <Select
                            id="admin-custom-badge-target"
                            name="adminCustomBadgeTarget"
                            aria-label="Custom badge target"
                            value={selectedCustomBadge}
                            onChange={(event) => setSelectedCustomBadge(event.target.value)}
                            title="Custom badge target"
                        >
                            <option value="">CUSTOM_BADGE</option>
                            {customBadges.filter(badge => badge.custom && badge.id).map((badge) => (
                                <option key={badge.id ?? badge.label} value={badge.id}>{badge.label}</option>
                            ))}
                        </Select>
                        <input
                            id="admin-suspend-hours"
                            name="suspendHours"
                            aria-label="Suspend duration in hours"
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
                                        <p className="m-0 truncate font-mono text-[10px] text-[#666]">{target.username ? `@${target.username} // ` : ''}{target.email}</p>
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
                                width={56}
                                height={56}
                                className="h-14 w-14 border border-[#333] object-cover"
                                referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                                <p className="m-0 truncate font-mono text-lg font-black uppercase text-white">{drawerUser.name}</p>
                                <p className="m-0 mt-1 truncate font-mono text-[10px] uppercase text-[#666]">{drawerUser.username ? `@${drawerUser.username} // ` : ''}{drawerUser.email}</p>
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
                            <div className="border border-[#242424] bg-[#101010] p-4 md:col-span-2">
                                <p className="m-0 mb-3 font-mono text-[10px] font-black uppercase tracking-widest text-[#777]">Profile Card Gift</p>
                                <div className="flex flex-wrap gap-2">
                                    <UiButton onClick={() => void grantProfileCard(drawerUser)} disabled={!selectedProfileCardTemplate} variant="success">Grant Selected Card</UiButton>
                                    <span className="self-center font-mono text-[10px] uppercase text-[#666]">
                                        {profileCardTemplates.find(template => template.id === selectedProfileCardTemplate)?.name || 'No template selected'}
                                    </span>
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

type ProfileCardFormState = {
    editingId: string;
    name: string;
    description: string;
    backgroundImage: string;
    orientation: 'HORIZONTAL' | 'VERTICAL';
    layout: ProfileCardLayout;
};

function initialProfileCardForm(): ProfileCardFormState {
    return {
        editingId: '',
        name: '',
        description: '',
        backgroundImage: '',
        orientation: 'HORIZONTAL',
        layout: {
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
            statsFontSize: 1.05,
            textColor: '#111111',
            accentColor: '#e60000',
        },
    };
}

function LayoutEditor({ layout, onChange }: { layout: ProfileCardLayout; onChange: (layout: ProfileCardLayout) => void }) {
    const update = (key: keyof ProfileCardLayout, value: number | string) => onChange({ ...layout, [key]: value });
    return (
        <div className="grid gap-3 border border-[#242424] bg-[#101010] p-3">
            <div className="grid grid-cols-2 gap-2">
                <NumberField label="Photo X" value={layout.photoX} onChange={(value) => update('photoX', value)} />
                <NumberField label="Photo Y" value={layout.photoY} onChange={(value) => update('photoY', value)} />
                <NumberField label="Photo W" value={layout.photoW} onChange={(value) => update('photoW', value)} />
                <NumberField label="Photo H" value={layout.photoH} onChange={(value) => update('photoH', value)} />
                <NumberField label="Name X" value={layout.nameX} onChange={(value) => update('nameX', value)} />
                <NumberField label="Name Y" value={layout.nameY} onChange={(value) => update('nameY', value)} />
                <NumberField label="Name W" value={layout.nameW} onChange={(value) => update('nameW', value)} />
                <NumberField label="Name H" value={layout.nameH} onChange={(value) => update('nameH', value)} />
                <NumberField label="Designation X" value={layout.designationX} onChange={(value) => update('designationX', value)} />
                <NumberField label="Designation Y" value={layout.designationY} onChange={(value) => update('designationY', value)} />
                <NumberField label="Designation W" value={layout.designationW} onChange={(value) => update('designationW', value)} />
                <NumberField label="Designation H" value={layout.designationH} onChange={(value) => update('designationH', value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <NumberField label="Name Font" value={layout.nameFontSize ?? 0.9} min={0.4} max={4} step={0.05} onChange={(value) => update('nameFontSize', value)} />
                <NumberField label="Role Font" value={layout.designationFontSize ?? 0.9} min={0.4} max={4} step={0.05} onChange={(value) => update('designationFontSize', value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <label className="font-mono text-[9px] uppercase text-[#666]">Text Color<input id="card-layout-text-color" name="cardLayoutTextColor" aria-label="Card text color" type="color" value={layout.textColor} onChange={(event) => update('textColor', event.target.value)} className="mt-1 block h-8 w-full" /></label>
                <label className="font-mono text-[9px] uppercase text-[#666]">Accent Color<input id="card-layout-accent-color" name="cardLayoutAccentColor" aria-label="Card accent color" type="color" value={layout.accentColor} onChange={(event) => update('accentColor', event.target.value)} className="mt-1 block h-8 w-full" /></label>
            </div>
        </div>
    );
}

function NumberField({
    label,
    value,
    min = 0,
    max = 100,
    step = 1,
    onChange,
}: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
}) {
    const fieldId = `card-layout-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return (
        <label className="font-mono text-[9px] uppercase text-[#666]">
            {label}
            <input
                id={fieldId}
                name={fieldId}
                aria-label={label}
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-1 h-8 w-full border border-[#333] bg-[#0b0b0b] px-2 text-white outline-none focus:border-[#e60000]"
            />
        </label>
    );
}

function TemplateOverlay({ layout }: { layout: ProfileCardLayout }) {
    return (
        <>
            <div className="absolute border-2 border-[#e60000]" style={{ left: `${layout.photoX}%`, top: `${layout.photoY}%`, width: `${layout.photoW}%`, height: `${layout.photoH}%` }} />
            <div className="absolute border border-[#38bdf8] bg-[#38bdf8]/20" style={{ left: `${layout.nameX}%`, top: `${layout.nameY}%`, width: `${layout.nameW}%`, height: `${layout.nameH}%` }} />
            <div className="absolute border border-[#22c55e] bg-[#22c55e]/20" style={{ left: `${layout.designationX}%`, top: `${layout.designationY}%`, width: `${layout.designationW}%`, height: `${layout.designationH}%` }} />
        </>
    );
}

async function readCardImage(file?: File) {
    if (!file) return '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        return '';
    }
    const source = URL.createObjectURL(file);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = source;
        });
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return '';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/webp', 0.76);
    } finally {
        URL.revokeObjectURL(source);
    }
}

async function readBadgeImage(file?: File) {
    if (!file) return '';
    if (file.type !== 'image/png') {
        throw new Error('Badge harus PNG transparan.');
    }
    const source = URL.createObjectURL(file);
    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = source;
        });
        if (image.naturalWidth !== image.naturalHeight) {
            throw new Error('Badge harus rasio 1:1.');
        }
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) return '';
        context.clearRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let hasTransparentPixel = false;
        for (let index = 3; index < pixels.length; index += 4) {
            if (pixels[index] < 245) {
                hasTransparentPixel = true;
                break;
            }
        }
        if (!hasTransparentPixel) {
            throw new Error('Badge harus punya background transparan.');
        }
        return canvas.toDataURL('image/png');
    } finally {
        URL.revokeObjectURL(source);
    }
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
