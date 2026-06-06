import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, FileText, ImagePlus, LoaderCircle, Pencil, RotateCcw, Send, Upload, X } from 'lucide-react';
import api, { cachedGet, invalidateApiCache } from '../lib/api';
import { DEFAULT_CATEGORIES } from '../utils/categoryColors';
import { sanitizeArticle, stripHtml } from '../utils/sanitize';
import type { ContentItem, CurrentUser } from '../types/forum';
import { useFeedback } from '../components/feedback';
import { Button as UiButton, Modal } from '../components/ui';

const RichTextEditor = lazy(() => import('../components/RichTextEditor'));

const MAX_IMAGE_ATTACHMENTS = 6;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const TARGET_IMAGE_DATA_URL_LENGTH = 380_000;
const MAX_IMAGE_DATA_URL_LENGTH = 480_000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DRAFT_SCHEMA_VERSION = 2;

type AttachedImage = {
    id: string;
    data: string;
    thumbnail: string;
    alt: string;
    size: number;
    originalSize: number;
    width: number;
    height: number;
};

type WriterDraft = {
    version: number;
    draftId?: string;
    title: string;
    kategori: string;
    activeTab: 'manual' | 'upload';
    content: string;
    images: AttachedImage[];
    fileName?: string;
    emergency?: boolean;
    emergencyReason?: string;
    savedAt: string;
};

export default function WritingPage({ user }: { user: CurrentUser | null }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const feedback = useFeedback();
    const editId = searchParams.get('edit') || '';
    const [title, setTitle] = useState('');
    const [selectedKategori, setSelectedKategori] = useState('General');
    const [categoryOptions, setCategoryOptions] = useState(DEFAULT_CATEGORIES);
    const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [images, setImages] = useState<AttachedImage[]>([]);
    const [compressingImages, setCompressingImages] = useState(false);
    const [imageNotice, setImageNotice] = useState<string | null>(null);
    const [studioMode, setStudioMode] = useState<'edit' | 'preview'>('edit');
    const [draftNotice, setDraftNotice] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | undefined>(undefined);
    const [editContentId, setEditContentId] = useState<string | undefined>(undefined);
    const [exitPrompt, setExitPrompt] = useState<{ nextPath: string } | null>(null);
    const [savingExitDraft, setSavingExitDraft] = useState(false);
    const [emergencyDraftPending, setEmergencyDraftPending] = useState(false);
    const lastServerImageSignature = useRef('');
    const allowExitRef = useRef(false);
    const draftKey = useMemo(() => `gebxby:writer-draft:${user?.userID ?? 'guest'}:${editId || 'new'}`, [editId, user?.userID]);
    const articleText = useMemo(() => stripHtml(content), [content]);
    const wordCount = useMemo(() => articleText ? articleText.split(/\s+/).filter(Boolean).length : 0, [articleText]);
    const readMinutes = Math.max(1, Math.ceil(wordCount / 220));
    const hasWritableDraft = useMemo(() => Boolean(title.trim() || hasReadableText(content) || images.length > 0 || file), [content, file, images.length, title]);

    useEffect(() => {
        if (!user) return;
        cachedGet<string[]>('/content/categories', undefined, { ttlMs: 5 * 60_000 })
            .then((categories) => setCategoryOptions(Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]))))
            .catch(() => setCategoryOptions(DEFAULT_CATEGORIES));
    }, [user]);

    const buildLocalDraft = useCallback((
        nextDraftId = draftId,
        options?: { emergency?: boolean; reason?: string },
    ): WriterDraft => ({
        version: DRAFT_SCHEMA_VERSION,
        draftId: nextDraftId,
        title,
        kategori: selectedKategori,
        activeTab,
        content,
        images,
        fileName: file?.name,
        emergency: Boolean(options?.emergency),
        emergencyReason: options?.reason,
        savedAt: new Date().toISOString(),
    }), [activeTab, content, draftId, file?.name, images, selectedKategori, title]);

    const persistLocalDraft = useCallback((
        notice = 'Local draft autosaved',
        options?: { nextDraftId?: string; emergency?: boolean; reason?: string },
    ) => {
        if (!user || !hasWritableDraft) {
            return false;
        }
        try {
            localStorage.setItem(draftKey, JSON.stringify(buildLocalDraft(options?.nextDraftId, options)));
            if (options?.emergency) {
                setEmergencyDraftPending(true);
            }
            setDraftNotice(notice);
            return true;
        } catch {
            setDraftNotice('Local draft save failed');
            return false;
        }
    }, [buildLocalDraft, draftKey, hasWritableDraft, user]);

    const applyLocalDraft = useCallback((draft: WriterDraft) => {
        if (draft.version !== DRAFT_SCHEMA_VERSION) return false;
        setDraftId(draft.draftId);
        setTitle(draft.title ?? '');
        setSelectedKategori(draft.kategori ?? 'General');
        setActiveTab(draft.activeTab ?? 'manual');
        setContent(draft.content ?? '');
        setFile(null);
        setImages(Array.isArray(draft.images) ? draft.images : []);
        setEmergencyDraftPending(Boolean(draft.emergency));
        setDraftNotice(draft.emergency ? 'Emergency draft restored' : draft.fileName ? 'Local draft restored; reattach DOCX file' : 'Local draft restored');
        return true;
    }, []);

    const applyContentToStudio = useCallback((item: ContentItem) => {
        setEditContentId(item.idContent);
        setDraftId(item.status === 'DRAFT' ? item.idContent : undefined);
        setTitle(item.head || '');
        setSelectedKategori(item.kategori || 'General');
        setActiveTab('manual');
        setContent(item.paragrafs || '');
        setImages(toAttachedImages(item));
        setDraftNotice(item.status === 'DRAFT' ? 'Server draft loaded' : 'Writing loaded');
    }, []);

    useEffect(() => {
        if (!user) return;
        const controller = new AbortController();

        const restoreLocalDraft = () => {
            const stored = localStorage.getItem(draftKey);
            if (!stored) return false;
            try {
                const draft = JSON.parse(stored) as WriterDraft;
                return applyLocalDraft(draft);
            } catch {
                localStorage.removeItem(draftKey);
                return false;
            }
        };

        if (!editId) {
            setEditContentId(undefined);
            setDraftId(undefined);
            if (!restoreLocalDraft()) {
                setTitle('');
                setSelectedKategori('General');
                setActiveTab('manual');
                setContent('');
                setFile(null);
                setImages([]);
                setStudioMode('edit');
                setDraftNotice('Draft standby');
            }
            return () => controller.abort();
        }

        api.get<ContentItem>(`/content/${editId}`, { signal: controller.signal })
            .then((response) => {
                applyContentToStudio(response.data);
                restoreLocalDraft();
            })
            .catch((error) => {
                if (!axios.isCancel(error)) {
                    feedback.toast('Tulisan tidak bisa dimuat ke Writing Studio.', 'error');
                    navigate('/profile');
                }
            });

        return () => controller.abort();
    }, [applyContentToStudio, applyLocalDraft, draftKey, editId, feedback, navigate, user]);

    useEffect(() => {
        if (!user) return;
        const timer = window.setTimeout(() => {
            if (!hasWritableDraft) {
                localStorage.removeItem(draftKey);
                return;
            }
            persistLocalDraft('Local draft autosaved');
        }, 900);
        return () => window.clearTimeout(timer);
    }, [draftKey, hasWritableDraft, persistLocalDraft, user]);

    const persistServerDraft = useCallback(async () => {
        if (!user || !hasWritableDraft) {
            return undefined;
        }
        const imageSignature = images.map(image => `${image.id}:${image.size}:${image.alt}`).join('|');
        const includeImages = images.length > 0 && imageSignature !== lastServerImageSignature.current;
        return saveServerDraft({
            draftId,
            title,
            selectedKategori,
            activeTab,
            content,
            images,
            includeImages,
            onSaved: (savedDraft) => {
                if (includeImages) {
                    lastServerImageSignature.current = imageSignature;
                }
                setDraftId(savedDraft.idContent);
                persistLocalDraft('Server draft saved', { nextDraftId: savedDraft.idContent });
                setEmergencyDraftPending(false);
            },
        });
    }, [activeTab, content, draftId, hasWritableDraft, images, persistLocalDraft, selectedKategori, title, user]);

    const saveEmergencyDraft = useCallback(async (reason: string, error?: unknown) => {
        const localSaved = persistLocalDraft('Emergency draft saved locally', { emergency: true, reason });
        if (!localSaved || isAuthExpired(error)) {
            return localSaved;
        }
        try {
            await persistServerDraft();
            return true;
        } catch {
            setDraftNotice('Emergency local draft safe');
            return localSaved;
        }
    }, [persistLocalDraft, persistServerDraft]);

    useEffect(() => {
        if (!user || !emergencyDraftPending || !hasWritableDraft) {
            return;
        }
        const timer = window.setTimeout(() => {
            persistServerDraft()
                .then((savedDraft) => {
                    if (savedDraft) {
                        feedback.toast('Draft darurat dipulihkan ke database.', 'success');
                    }
                })
                .catch(() => {
                    setDraftNotice('Emergency local draft safe');
                });
        }, 1200);
        return () => window.clearTimeout(timer);
    }, [emergencyDraftPending, feedback, hasWritableDraft, persistServerDraft, user]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (allowExitRef.current || !hasWritableDraft) return;
            persistLocalDraft('Emergency draft saved locally', { emergency: true, reason: 'PAGE_UNLOAD' });
            void persistServerDraft();
            event.preventDefault();
            event.returnValue = '';
        };
        const handlePageHide = () => {
            if (allowExitRef.current || !hasWritableDraft) return;
            persistLocalDraft('Emergency draft saved locally', { emergency: true, reason: 'PAGE_HIDE' });
            void persistServerDraft();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [hasWritableDraft, persistLocalDraft, persistServerDraft]);

    useEffect(() => {
        const interceptInternalNavigation = (event: MouseEvent) => {
            if (allowExitRef.current || !hasWritableDraft || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }
            const target = event.target instanceof Element ? event.target : null;
            const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
            if (!anchor || anchor.target || anchor.download) {
                return;
            }
            const url = new URL(anchor.href);
            if (url.origin !== window.location.origin) {
                return;
            }
            const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const nextPath = `${url.pathname}${url.search}${url.hash}`;
            if (nextPath === currentPath) {
                return;
            }
            event.preventDefault();
            setExitPrompt({ nextPath });
        };
        document.addEventListener('click', interceptInternalNavigation, true);
        return () => document.removeEventListener('click', interceptInternalNavigation, true);
    }, [hasWritableDraft]);

    if (!user) {
        return <div className="mt-20 text-center font-mono italic text-white">ACCESS DENIED: SESSION REQUIRED</div>;
    }

    const handlePublishManual = async () => {
        if (!title.trim() || !hasReadableText(content)) {
            feedback.toast('Judul dan isi laporan wajib ada.', 'error');
            return;
        }
        setSubmitting(true);
        persistLocalDraft('Upload checkpoint saved');
        try {
            const payload = {
                head: title,
                paragrafs: content,
                kategori: selectedKategori,
                images: buildImagePayload(images),
            };
            const response = editContentId && !draftId
                ? await api.put<ContentItem>(`/content/edit/${editContentId}`, payload)
                : draftId
                    ? await publishDraftOrCreateContent(draftId, payload)
                    : await api.post<ContentItem>('/content/add-manual', payload);
            allowExitRef.current = true;
            localStorage.removeItem(draftKey);
            setDraftId(undefined);
            invalidatePublishedContentCaches(user.userID);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            const emergencySaved = await saveEmergencyDraft('MANUAL_PUBLISH_FAILED', error);
            handleSubmitError(error, feedback.toast, navigate, emergencySaved);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadFile = async () => {
        if (!file || !title.trim()) {
            feedback.toast('Pilih file dan isi judul dulu, Officer.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('kategori', selectedKategori);
        formData.append('imagesJson', JSON.stringify(buildImagePayload(images)));

        setSubmitting(true);
        persistLocalDraft('Upload checkpoint saved');
        try {
            const response = await api.post<ContentItem>('/content/upload', formData);
            allowExitRef.current = true;
            localStorage.removeItem(draftKey);
            if (draftId) {
                void deleteServerDraft(draftId);
                setDraftId(undefined);
            }
            invalidatePublishedContentCaches(user.userID);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            const emergencySaved = await saveEmergencyDraft('DOCX_UPLOAD_FAILED', error);
            handleSubmitError(error, feedback.toast, navigate, emergencySaved);
        } finally {
            setSubmitting(false);
        }
    };

    const submit = activeTab === 'manual' ? handlePublishManual : handleUploadFile;
    const actionDisabled = submitting || compressingImages;
    const resetDraft = () => {
        setTitle('');
        setContent('');
        setFile(null);
        setImages([]);
        setSelectedKategori('General');
        setActiveTab('manual');
        setStudioMode('edit');
        setDraftNotice('Draft cleared');
        setEmergencyDraftPending(false);
        localStorage.removeItem(draftKey);
        lastServerImageSignature.current = '';
        if (draftId) {
            void deleteServerDraft(draftId);
            setDraftId(undefined);
        }
    };

    const handleImageSelection = async (files: FileList | null) => {
        if (!files?.length) {
            return;
        }
        setImageNotice(null);
        const slotsLeft = MAX_IMAGE_ATTACHMENTS - images.length;
        if (slotsLeft <= 0) {
            setImageNotice(`Maksimal ${MAX_IMAGE_ATTACHMENTS} gambar per tulisan.`);
            return;
        }

        const selected = Array.from(files).slice(0, slotsLeft);
        setCompressingImages(true);
        try {
            const compressed = await Promise.all(selected.map(compressImageForUpload));
            setImages(current => [...current, ...compressed].slice(0, MAX_IMAGE_ATTACHMENTS));
            const skipped = files.length - selected.length;
            setImageNotice(skipped > 0 ? `${compressed.length} gambar siap. ${skipped} gambar dilewati karena batas attachment.` : `${compressed.length} gambar siap di-attach.`);
        } catch (error) {
            setImageNotice(error instanceof Error ? error.message : 'Gagal memproses gambar.');
        } finally {
            setCompressingImages(false);
        }
    };

    const saveDraftAndLeave = async () => {
        if (!exitPrompt) return;
        setSavingExitDraft(true);
        try {
            const saved = await persistServerDraft();
            if (saved) {
                localStorage.removeItem(draftKey);
                setEmergencyDraftPending(false);
                invalidateApiCache(`/content/by-user/${user.userID}`);
                feedback.toast('Draft disimpan ke database.', 'success');
            }
            allowExitRef.current = true;
            navigate(exitPrompt.nextPath);
        } catch {
            feedback.toast('Draft gagal disimpan ke database. Local draft tetap aman.', 'error');
        } finally {
            setSavingExitDraft(false);
            setExitPrompt(null);
        }
    };

    const discardDraftAndLeave = () => {
        if (!exitPrompt) return;
        allowExitRef.current = true;
        localStorage.removeItem(draftKey);
        setEmergencyDraftPending(false);
        setExitPrompt(null);
        navigate(exitPrompt.nextPath);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] px-3 py-4 font-mono text-[#eee] sm:px-5 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1220px] border border-[#333] bg-[#111] p-4 shadow-2xl sm:p-5 lg:p-6">
                <div className="mb-6 flex flex-col gap-3 border-b border-[#e60000] pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-normal text-[#e60000]">Writer Studio</h2>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-[#666]">
                            {wordCount} words // {readMinutes} min read // {draftNotice ?? 'Draft standby'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={resetDraft}
                            className="flex h-9 items-center justify-center gap-2 border border-[#333] px-3 font-mono text-[10px] font-black uppercase text-[#777] transition-all hover:border-white hover:text-white"
                        >
                            <RotateCcw size={14} />
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={actionDisabled}
                            className="flex h-9 items-center justify-center gap-2 bg-[#e60000] px-4 text-xs font-black uppercase text-white shadow-[3px_3px_0px_#444] transition-all hover:bg-white hover:text-[#e60000] disabled:cursor-wait disabled:opacity-60 sm:px-5"
                        >
                            {activeTab === 'manual' ? <Send size={16} /> : <Upload size={16} />}
                            {actionDisabled ? 'PROCESSING' : activeTab === 'manual' ? 'UPLOAD DATA' : 'DECRYPT FILE'}
                        </button>
                    </div>
                </div>

                <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <ModeButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<FileText size={15} />} label="MANUAL INPUT" />
                        <ModeButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<Upload size={15} />} label="DOCX FILE UPLOAD" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <ModeButton active={studioMode === 'edit'} onClick={() => setStudioMode('edit')} icon={<Pencil size={15} />} label="EDIT" />
                        <ModeButton active={studioMode === 'preview'} onClick={() => setStudioMode('preview')} icon={<Eye size={15} />} label="PREVIEW" />
                    </div>
                </div>

                <div className="space-y-5">
                    <input
                        id="writing-title"
                        name="writingTitle"
                        aria-label="Writing title"
                        className="w-full border-b border-[#222] bg-transparent py-2 text-4xl font-black text-white outline-none transition-colors focus:border-[#e60000]"
                        placeholder="SUBJECT TITLE..."
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={180}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <select
                            id="writing-category"
                            name="writingCategory"
                            aria-label="Writing category"
                            className="cursor-pointer border border-[#333] bg-[#1a1a1a] p-3 text-xs font-bold uppercase outline-none focus:border-[#e60000]"
                            value={selectedKategori}
                            onChange={(event) => setSelectedKategori(event.target.value)}
                        >
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2 border border-[#333] bg-[#1a1a1a] p-3 text-[10px]">
                            <span className="text-[#666]">Author UUID:</span>
                            <span className="font-bold text-sky-500">{user.userID?.substring(0, 8)}...</span>
                        </div>
                    </div>

                    {studioMode === 'preview' ? (
                        <ArticlePreview title={title} kategori={selectedKategori} content={content} images={images} />
                    ) : activeTab === 'manual' ? (
                        <Suspense fallback={<EditorSkeleton />}>
                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                            />
                        </Suspense>
                    ) : (
                        <div className="mx-auto w-full max-w-[1080px] border-2 border-dashed border-[#333] bg-[#0d0d0d] p-12 text-center transition-all hover:border-[#e60000]">
                            <input
                                name="docxFile"
                                aria-label="Upload DOCX file"
                                type="file"
                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                id="fileInput"
                                className="hidden"
                                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                            />
                            <label htmlFor="fileInput" className="cursor-pointer">
                                <p className="text-sm text-[#666] transition-colors hover:text-white">
                                    {file ? `File Selected: ${file.name}` : 'DRAG AND DROP OR CLICK TO SELECT .DOCX FILE'}
                                </p>
                            </label>
                        </div>
                    )}

                    <ImageAttachmentPanel
                        images={images}
                        notice={imageNotice}
                        compressing={compressingImages}
                        onSelect={handleImageSelection}
                        onRemove={(id) => setImages(current => current.filter(image => image.id !== id))}
                        onAltChange={(id, alt) => setImages(current => current.map(image => image.id === id ? { ...image, alt } : image))}
                    />
                </div>
            </div>
            {exitPrompt && (
                <Modal
                    title="Save Draft?"
                    onClose={() => setExitPrompt(null)}
                    footer={(
                        <>
                            <UiButton onClick={discardDraftAndLeave} disabled={savingExitDraft}>Discard</UiButton>
                            <UiButton onClick={() => void saveDraftAndLeave()} disabled={savingExitDraft} variant="danger">
                                {savingExitDraft ? 'Saving' : 'Save Draft'}
                            </UiButton>
                        </>
                    )}
                >
                    <p className="m-0 font-sans text-sm leading-7 text-[#bbb]">
                        Ada perubahan di Writing Studio. Simpan sebagai draft database sebelum keluar, atau buang perubahan ini.
                    </p>
                </Modal>
            )}
        </div>
    );
}

function invalidatePublishedContentCaches(userId: string) {
    invalidateApiCache('/content/all-content');
    invalidateApiCache('/content/feed');
    invalidateApiCache('/content/feed-page');
    invalidateApiCache('/content/latest');
    invalidateApiCache(`/content/by-user/${userId}`);
    invalidateApiCache('/content/categories');
    invalidateApiCache('/content/analytics');
}

async function saveServerDraft({
    draftId,
    title,
    selectedKategori,
    activeTab,
    content,
    images,
    includeImages,
    onSaved,
}: {
    draftId?: string;
    title: string;
    selectedKategori: string;
    activeTab: 'manual' | 'upload';
    content: string;
    images: AttachedImage[];
    includeImages: boolean;
    onSaved: (draft: ContentItem) => void;
}) {
    const body: {
        head: string;
        paragrafs: string;
        kategori: string;
        images?: ReturnType<typeof buildImagePayload>;
    } = {
        head: title || 'Untitled Draft',
        paragrafs: activeTab === 'manual' ? content : '',
        kategori: selectedKategori,
    };
    if (includeImages && images.length > 0) {
        body.images = buildImagePayload(images);
    }
    const response = draftId
        ? await updateDraftOrCreateNew(draftId, body)
        : await api.post<ContentItem>('/content/drafts', body);
    onSaved(response.data);
    invalidateApiCache(`/content/by-user/${response.data.user?.userID ?? ''}`);
    return response.data;
}

async function updateDraftOrCreateNew(
    draftId: string,
    body: {
        head: string;
        paragrafs: string;
        kategori: string;
        images?: ReturnType<typeof buildImagePayload>;
    },
) {
    try {
        return await api.put<ContentItem>(`/content/drafts/${draftId}`, body);
    } catch (error) {
        if (!shouldRecoverStaleDraft(error)) {
            throw error;
        }
        return api.post<ContentItem>('/content/drafts', body);
    }
}

async function publishDraftOrCreateContent(
    draftId: string,
    payload: {
        head: string;
        paragrafs: string;
        kategori: string;
        images: ReturnType<typeof buildImagePayload>;
    },
) {
    try {
        return await api.post<ContentItem>(`/content/drafts/${draftId}/publish`, payload);
    } catch (error) {
        if (!shouldRecoverStaleDraft(error)) {
            throw error;
        }
        return api.post<ContentItem>('/content/add-manual', payload);
    }
}

function shouldRecoverStaleDraft(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return false;
    }
    const status = error.response?.status;
    return status === 404 || status === 410;
}

async function deleteServerDraft(draftId: string) {
    try {
        await api.delete(`/content/${draftId}`);
    } catch {
        // Draft cleanup is best-effort; a failed cleanup should not block the writer.
    }
}

function buildImagePayload(images: AttachedImage[]) {
    return images.map(image => ({
        data: image.data,
        thumbnail: image.thumbnail,
        alt: image.alt,
        width: image.width,
        height: image.height,
    }));
}

function toAttachedImages(item: ContentItem): AttachedImage[] {
    return (item.images ?? [])
        .filter(image => Boolean(image.data))
        .slice(0, MAX_IMAGE_ATTACHMENTS)
        .map(image => ({
            id: image.id || createClientId(),
            data: image.data,
            thumbnail: image.thumbnail || image.data,
            alt: image.alt || 'Attached visual',
            size: image.size || image.data.length,
            originalSize: image.size || image.data.length,
            width: image.width || 1280,
            height: image.height || 720,
        }));
}

function ArticlePreview({
    title,
    kategori,
    content,
    images,
}: {
    title: string;
    kategori: string;
    content: string;
    images: AttachedImage[];
}) {
    return (
        <section className="mx-auto w-full max-w-[1080px] border border-[#333] bg-[#0f0f0f]">
            <header className="border-b border-[#252525] p-5">
                <span className="inline-flex border border-[#e60000] px-2 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-[#e60000]">
                    {kategori || 'General'}
                </span>
                <h1 className="m-0 mt-4 break-words font-mono text-3xl font-black uppercase tracking-normal text-white">
                    {title || 'Untitled Entry'}
                </h1>
            </header>
            <div
                className="min-h-[520px] p-5 font-sans text-base leading-8 text-[#ddd] [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[#e60000] [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:text-4xl [&_h1]:font-black [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-black [&_li]:mb-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-8 [&_p]:mb-5 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-8"
                dangerouslySetInnerHTML={{ __html: sanitizeArticle(content || '<p>No decrypted data.</p>') }}
            />
            {images.length > 0 && (
                <div className="grid gap-3 border-t border-[#252525] p-5 md:grid-cols-2">
                    {images.map((image) => (
                        <figure key={image.id} className="m-0 border border-[#333] bg-black">
                            <img src={image.data} alt={image.alt} width={image.width} height={image.height} className="max-h-80 w-full object-contain" />
                            <figcaption className="border-t border-[#222] px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#777]">
                                {image.alt || 'Attached visual'}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
        </section>
    );
}

function EditorSkeleton() {
    return (
        <section className="mx-auto min-h-[570px] w-full max-w-[1080px] animate-pulse border border-[#333] bg-[#0f0f0f]">
            <div className="flex h-12 gap-2 border-b border-[#252525] bg-[#111] p-2">
                {Array.from({ length: 10 }).map((_, index) => (
                    <span key={index} className="block h-8 w-8 border border-[#2a2a2a] bg-[#151515]" />
                ))}
            </div>
            <div className="space-y-4 p-6">
                <div className="h-4 w-2/3 bg-[#181818]" />
                <div className="h-4 w-5/6 bg-[#181818]" />
                <div className="h-4 w-1/2 bg-[#181818]" />
            </div>
        </section>
    );
}

function ImageAttachmentPanel({
    images,
    notice,
    compressing,
    onSelect,
    onRemove,
    onAltChange,
}: {
    images: AttachedImage[];
    notice: string | null;
    compressing: boolean;
    onSelect: (files: FileList | null) => Promise<void>;
    onRemove: (id: string) => void;
    onAltChange: (id: string, alt: string) => void;
}) {
    return (
        <section className="border border-[#333] bg-[#0d0d0d] p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="m-0 text-xs font-black uppercase tracking-widest text-white">Image Attachments</p>
                    <p className="m-0 mt-1 text-[10px] uppercase tracking-widest text-[#666]">
                        {images.length}/{MAX_IMAGE_ATTACHMENTS} files // auto-compressed before upload
                    </p>
                </div>
                <input
                    id="imageAttachments"
                    name="imageAttachments"
                    aria-label="Attach writing images"
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={(event) => {
                        void onSelect(event.target.files);
                        event.currentTarget.value = '';
                    }}
                />
                <label
                    htmlFor="imageAttachments"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 border border-[#e60000] px-4 py-2 text-[10px] font-black uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                >
                    {compressing ? <LoaderCircle size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {compressing ? 'Compressing' : 'Attach Image'}
                </label>
            </div>

            {notice && (
                <div className="mb-4 border border-[#333] bg-[#111] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#999]">
                    {notice}
                </div>
            )}

            {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {images.map(image => (
                        <figure key={image.id} className="relative m-0 border border-[#333] bg-black">
                            <img src={image.data} alt={image.alt} width={image.width} height={image.height} className="h-32 w-full object-cover" />
                            <figcaption className="border-t border-[#222] px-2 py-2 text-[9px] uppercase text-[#777]">
                                <input
                                    id={`image-caption-${image.id}`}
                                    name={`imageCaption-${image.id}`}
                                    aria-label="Image caption"
                                    value={image.alt}
                                    onChange={(event) => onAltChange(image.id, event.target.value)}
                                    className="mb-2 w-full border border-[#222] bg-[#0b0b0b] px-2 py-1 font-mono text-[9px] uppercase text-white outline-none focus:border-[#e60000]"
                                    placeholder="Image caption"
                                    maxLength={120}
                                />
                                <div className="flex items-center justify-between gap-2">
                                    <span>{image.width}x{image.height}</span>
                                    <span>{formatBytes(image.size)}</span>
                                </div>
                            </figcaption>
                            <button
                                type="button"
                                onClick={() => onRemove(image.id)}
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center border border-[#e60000] bg-[#111] text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                                title="Remove image"
                            >
                                <X size={14} />
                            </button>
                        </figure>
                    ))}
                </div>
            )}
        </section>
    );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap border px-3 text-[11px] font-bold uppercase transition-all sm:w-auto sm:min-w-[140px] ${
                active ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#333] text-[#666] hover:border-[#e60000]/60 hover:text-white'
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

async function compressImageForUpload(file: File): Promise<AttachedImage> {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        throw new Error('Format gambar harus PNG, JPG, atau WebP.');
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
        throw new Error(`Gambar ${file.name} terlalu besar. Maksimal sumber ${formatBytes(MAX_SOURCE_IMAGE_BYTES)}.`);
    }

    const sourceUrl = URL.createObjectURL(file);
    try {
        const sourceImage = await loadImage(sourceUrl);
        const attempts = [
            { maxDimension: 1280, quality: 0.82 },
            { maxDimension: 1120, quality: 0.76 },
            { maxDimension: 980, quality: 0.7 },
            { maxDimension: 840, quality: 0.66 },
            { maxDimension: 720, quality: 0.62 },
        ];
        const thumbnailBlob = await canvasToBlob(renderImageToCanvas(sourceImage, 360), 'image/webp', 0.68);
        const thumbnail = await blobToDataUrl(thumbnailBlob);
        let fallback: AttachedImage | null = null;

        for (const attempt of attempts) {
            const canvas = renderImageToCanvas(sourceImage, attempt.maxDimension);
            const blob = await canvasToBlob(canvas, 'image/webp', attempt.quality);
            const data = await blobToDataUrl(blob);
            const compressed: AttachedImage = {
                id: createClientId(),
                data,
                thumbnail,
                alt: cleanImageName(file.name),
                size: blob.size,
                originalSize: file.size,
                width: canvas.width,
                height: canvas.height,
            };

            if (data.length <= TARGET_IMAGE_DATA_URL_LENGTH) {
                return compressed;
            }
            fallback = compressed;
        }

        if (fallback && fallback.data.length <= MAX_IMAGE_DATA_URL_LENGTH) {
            return fallback;
        }
        throw new Error(`Gambar ${file.name} masih terlalu besar setelah kompresi.`);
    } finally {
        URL.revokeObjectURL(sourceUrl);
    }
}

function loadImage(sourceUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Gambar gagal dibaca.'));
        image.src = sourceUrl;
    });
}

function renderImageToCanvas(image: HTMLImageElement, maxDimension: number) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Browser tidak bisa memproses gambar ini.');
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(blob);
                return;
            }
            reject(new Error('Gambar gagal dikompresi.'));
        }, type, quality);
    });
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Gambar gagal dipaketkan.'));
        reader.readAsDataURL(blob);
    });
}

function cleanImageName(name: string) {
    const baseName = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    return (baseName || 'Attached image').slice(0, 120);
}

function createClientId() {
    return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasReadableText(html: string) {
    const element = document.createElement('div');
    element.innerHTML = html;
    return Boolean(element.textContent?.trim());
}

function isAuthExpired(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return false;
    }
    const status = error.response?.status;
    return status === 401 || status === 403;
}

function handleSubmitError(
    error: unknown,
    toast: (message: string, tone?: 'success' | 'error' | 'info') => void,
    navigate: (path: string) => void,
    draftSaved = false,
) {
    const draftSuffix = draftSaved ? ' Draft darurat sudah aman.' : '';
    if (isAuthExpired(error)) {
        toast(`Sesi akses berakhir. Silakan login ulang.${draftSuffix}`, 'error');
        navigate('/login');
        return;
    }
    if (axios.isAxiosError(error) && error.response?.status === 423) {
        toast(`Akun sedang disuspend sementara. Publikasi ditahan.${draftSuffix}`, 'error');
        return;
    }
    toast(`Critical Error: Gagal sinkronisasi dengan database.${draftSuffix}`, 'error');
}
