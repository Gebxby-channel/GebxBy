import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Bold, Eye, FileText, Heading1, Heading2, ImagePlus, Italic, Link as LinkIcon, List, ListOrdered, LoaderCircle, Pencil, Quote, Redo2, RotateCcw, Send, Type, Underline as UnderlineIcon, Undo2, Upload, X } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import api, { cachedGet, invalidateApiCache } from '../lib/api';
import { DEFAULT_CATEGORIES } from '../utils/categoryColors';
import { sanitizeArticle, stripHtml } from '../utils/sanitize';
import type { ContentItem, CurrentUser } from '../types/forum';
import { useFeedback } from '../components/feedback';

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
    savedAt: string;
};

export default function WritingPage({ user }: { user: CurrentUser | null }) {
    const navigate = useNavigate();
    const feedback = useFeedback();
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
    const lastServerImageSignature = useRef('');
    const draftKey = useMemo(() => `gebxby:writer-draft:${user?.userID ?? 'guest'}`, [user?.userID]);
    const articleText = useMemo(() => stripHtml(content), [content]);
    const wordCount = useMemo(() => articleText ? articleText.split(/\s+/).filter(Boolean).length : 0, [articleText]);
    const readMinutes = Math.max(1, Math.ceil(wordCount / 220));

    useEffect(() => {
        if (!user) return;
        cachedGet<string[]>('/content/categories', undefined, { ttlMs: 5 * 60_000 })
            .then((categories) => setCategoryOptions(Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]))))
            .catch(() => setCategoryOptions(DEFAULT_CATEGORIES));
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const stored = localStorage.getItem(draftKey);
        if (!stored) return;
        try {
            const draft = JSON.parse(stored) as WriterDraft;
            if (draft.version !== DRAFT_SCHEMA_VERSION) return;
            setDraftId(draft.draftId);
            setTitle(draft.title ?? '');
            setSelectedKategori(draft.kategori ?? 'General');
            setActiveTab(draft.activeTab ?? 'manual');
            setContent(draft.content ?? '');
            setImages(Array.isArray(draft.images) ? draft.images : []);
            setDraftNotice('Draft restored');
        } catch {
            localStorage.removeItem(draftKey);
        }
    }, [draftKey, user]);

    useEffect(() => {
        if (!user) return;
        const timer = window.setTimeout(() => {
            const hasDraft = title.trim() || content.trim() || images.length > 0;
            if (!hasDraft) {
                localStorage.removeItem(draftKey);
                return;
            }
            const draft: WriterDraft = {
                version: DRAFT_SCHEMA_VERSION,
                draftId,
                title,
                kategori: selectedKategori,
                activeTab,
                content,
                images,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
            setDraftNotice('Draft autosaved');
            const imageSignature = images.map(image => `${image.id}:${image.size}:${image.alt}`).join('|');
            const includeImages = imageSignature !== lastServerImageSignature.current;
            void saveServerDraft({
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
                    localStorage.setItem(draftKey, JSON.stringify({ ...draft, draftId: savedDraft.idContent }));
                },
            }).catch(() => setDraftNotice('Local draft autosaved'));
        }, 900);
        return () => window.clearTimeout(timer);
    }, [activeTab, content, draftId, draftKey, images, selectedKategori, title, user]);

    if (!user) {
        return <div className="mt-20 text-center font-mono italic text-white">ACCESS DENIED: SESSION REQUIRED</div>;
    }

    const handlePublishManual = async () => {
        if (!title.trim() || !hasReadableText(content)) {
            feedback.toast('Judul dan isi laporan wajib ada.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                head: title,
                paragrafs: content,
                kategori: selectedKategori,
                images: buildImagePayload(images),
            };
            const response = draftId
                ? await publishDraftOrCreateContent(draftId, payload)
                : await api.post<ContentItem>('/content/add-manual', payload);
            localStorage.removeItem(draftKey);
            setDraftId(undefined);
            invalidatePublishedContentCaches(user.userID);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            handleSubmitError(error, feedback.toast, navigate);
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
        try {
            const response = await api.post<ContentItem>('/content/upload', formData);
            localStorage.removeItem(draftKey);
            if (draftId) {
                void deleteServerDraft(draftId);
                setDraftId(undefined);
            }
            invalidatePublishedContentCaches(user.userID);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            handleSubmitError(error, feedback.toast, navigate);
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

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 font-mono text-[#eee] lg:p-8">
            <div className="mx-auto max-w-4xl border border-[#333] bg-[#111] p-6 shadow-2xl">
                <div className="mb-8 flex flex-col gap-4 border-b border-[#e60000] pb-4 md:flex-row md:items-center md:justify-between">
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
                            className="flex items-center justify-center gap-2 border border-[#333] px-4 py-2 font-mono text-[10px] font-black uppercase text-[#777] transition-all hover:border-white hover:text-white"
                        >
                            <RotateCcw size={14} />
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={actionDisabled}
                            className="flex items-center justify-center gap-2 bg-[#e60000] px-8 py-2 font-black text-white shadow-[4px_4px_0px_#444] transition-all hover:bg-white hover:text-[#e60000] disabled:cursor-wait disabled:opacity-60"
                        >
                            {activeTab === 'manual' ? <Send size={16} /> : <Upload size={16} />}
                            {actionDisabled ? 'PROCESSING' : activeTab === 'manual' ? 'UPLOAD DATA' : 'DECRYPT FILE'}
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid gap-3 md:grid-cols-2">
                    <div className="flex gap-3">
                        <ModeButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<FileText size={15} />} label="MANUAL INPUT" />
                        <ModeButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<Upload size={15} />} label="DOCX FILE UPLOAD" />
                    </div>
                    <div className="flex gap-3">
                        <ModeButton active={studioMode === 'edit'} onClick={() => setStudioMode('edit')} icon={<Pencil size={15} />} label="EDIT" />
                        <ModeButton active={studioMode === 'preview'} onClick={() => setStudioMode('preview')} icon={<Eye size={15} />} label="PREVIEW" />
                    </div>
                </div>

                <div className="space-y-6">
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
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                        />
                    ) : (
                        <div className="border-2 border-dashed border-[#333] bg-[#0d0d0d] p-12 text-center transition-all hover:border-[#e60000]">
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
        </div>
    );
}

function invalidatePublishedContentCaches(userId: string) {
    invalidateApiCache('/content/all-content');
    invalidateApiCache('/content/feed');
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
    return !status || status === 404 || status === 410 || status === 500 || status === 502 || status === 503;
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
        <section className="border border-[#333] bg-[#0f0f0f]">
            <header className="border-b border-[#252525] p-5">
                <span className="inline-flex border border-[#e60000] px-2 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-[#e60000]">
                    {kategori || 'General'}
                </span>
                <h1 className="m-0 mt-4 break-words font-mono text-3xl font-black uppercase tracking-normal text-white">
                    {title || 'Untitled Entry'}
                </h1>
            </header>
            <div
                className="min-h-[360px] p-5 font-sans text-base leading-8 text-[#ddd] [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-[#e60000] [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:text-4xl [&_h1]:font-black [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-black [&_li]:mb-2 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-8 [&_p]:mb-5 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-8"
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

function RichTextEditor({
    content,
    onChange,
}: {
    content: string;
    onChange: (value: string) => void;
}) {
    const feedback = useFeedback();
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                link: false,
                underline: false,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
            }),
            Placeholder.configure({
                placeholder: 'Input decrypted data here...',
            }),
        ],
        content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'min-h-[460px] w-full overflow-y-auto p-5 font-sans text-base leading-8 text-[#ddd] outline-none transition-colors focus:bg-[#0d0d0d]',
            },
        },
        onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    });

    useEffect(() => {
        if (!editor || editor.isFocused || editor.getHTML() === content) {
            return;
        }
        editor.commands.setContent(content || '', { emitUpdate: false });
    }, [content, editor]);

    const transformSelection = (mode: 'upper' | 'lower') => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) {
            feedback.toast('Pilih teks dulu untuk mengubah besar kecil huruf.', 'info');
            return;
        }
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        editor.chain().focus().insertContentAt({ from, to }, mode === 'upper' ? selectedText.toUpperCase() : selectedText.toLowerCase()).run();
    };

    const setLink = async () => {
        if (!editor) return;
        const url = await feedback.prompt({
            title: 'Pasang Link',
            message: 'Masukkan URL yang akan ditempel ke teks terpilih.',
            placeholder: 'https://example.com',
            confirmLabel: 'Apply Link',
            maxLength: 300,
        });
        if (!url) {
            return;
        }
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    };

    return (
        <section className="border border-[#333] bg-[#0f0f0f]">
            <div className="flex flex-wrap gap-1 border-b border-[#252525] bg-[#111] p-2">
                <EditorButton active={editor?.isActive('bold')} icon={<Bold size={14} />} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} />
                <EditorButton active={editor?.isActive('italic')} icon={<Italic size={14} />} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} />
                <EditorButton active={editor?.isActive('underline')} icon={<UnderlineIcon size={14} />} label="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()} />
                <EditorButton active={editor?.isActive('heading', { level: 1 })} icon={<Heading1 size={15} />} label="Heading 1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} />
                <EditorButton active={editor?.isActive('heading', { level: 2 })} icon={<Heading2 size={15} />} label="Heading 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
                <EditorButton active={editor?.isActive('paragraph')} icon={<Type size={14} />} label="Paragraph" onClick={() => editor?.chain().focus().setParagraph().run()} />
                <EditorButton active={editor?.isActive('bulletList')} icon={<List size={14} />} label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()} />
                <EditorButton active={editor?.isActive('orderedList')} icon={<ListOrdered size={14} />} label="Number list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
                <EditorButton active={editor?.isActive('blockquote')} icon={<Quote size={14} />} label="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
                <EditorButton active={editor?.isActive('link')} icon={<LinkIcon size={14} />} label="Link" onClick={() => void setLink()} />
                <EditorButton icon={<Undo2 size={14} />} label="Undo" onClick={() => editor?.chain().focus().undo().run()} />
                <EditorButton icon={<Redo2 size={14} />} label="Redo" onClick={() => editor?.chain().focus().redo().run()} />
                <EditorButton text="UPPER" label="Uppercase selection" onClick={() => transformSelection('upper')} />
                <EditorButton text="lower" label="Lowercase selection" onClick={() => transformSelection('lower')} />
            </div>
            <EditorContent
                editor={editor}
                className="writer-prose [&_.ProseMirror]:min-h-[460px] [&_.ProseMirror]:w-full [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:p-5 [&_.ProseMirror]:font-sans [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-8 [&_.ProseMirror]:text-[#ddd] [&_.ProseMirror]:outline-none [&_.ProseMirror:focus]:bg-[#0d0d0d] [&_blockquote]:border-l-4 [&_blockquote]:border-[#e60000] [&_blockquote]:pl-4 [&_h1]:text-4xl [&_h1]:font-black [&_h2]:text-2xl [&_h2]:font-black [&_ol]:list-decimal [&_ol]:pl-8 [&_ul]:list-disc [&_ul]:pl-8"
            />
            <div className="border-t border-[#222] px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#555]">
                ProseMirror protocol // headings, bold, italic, underline, link, quote, lists, undo, redo
            </div>
        </section>
    );
}

function EditorButton({ icon, text, label, active = false, onClick }: { icon?: ReactNode; text?: string; label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            title={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={`flex h-8 min-w-8 items-center justify-center border px-2 font-mono text-[9px] font-black uppercase transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white ${
                active ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#2a2a2a] text-[#888]'
            }`}
        >
            {icon ?? text}
        </button>
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
            className={`flex flex-1 items-center justify-center gap-2 border py-2 text-xs font-bold transition-all ${
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

function handleSubmitError(error: unknown, toast: (message: string, tone?: 'success' | 'error' | 'info') => void, navigate: (path: string) => void) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
        toast('Sesi akses berakhir. Silakan login ulang.', 'error');
        navigate('/login');
        return;
    }
    if (axios.isAxiosError(error) && error.response?.status === 423) {
        toast('Akun sedang disuspend sementara. Publikasi ditahan.', 'error');
        return;
    }
    toast('Critical Error: Gagal sinkronisasi dengan database.', 'error');
}
