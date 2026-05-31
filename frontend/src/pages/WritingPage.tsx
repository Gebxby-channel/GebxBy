import { useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, ImagePlus, LoaderCircle, Send, Upload, X } from 'lucide-react';
import api, { invalidateApiCache } from '../lib/api';
import { DEFAULT_CATEGORIES } from '../utils/categoryColors';
import type { ContentItem, CurrentUser } from '../types/forum';

const MAX_IMAGE_ATTACHMENTS = 6;
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const TARGET_IMAGE_DATA_URL_LENGTH = 380_000;
const MAX_IMAGE_DATA_URL_LENGTH = 480_000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type AttachedImage = {
    id: string;
    data: string;
    alt: string;
    size: number;
    originalSize: number;
};

export default function WritingPage({ user }: { user: CurrentUser | null }) {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [selectedKategori, setSelectedKategori] = useState('General');
    const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [images, setImages] = useState<AttachedImage[]>([]);
    const [compressingImages, setCompressingImages] = useState(false);
    const [imageNotice, setImageNotice] = useState<string | null>(null);

    if (!user) {
        return <div className="mt-20 text-center font-mono italic text-white">ACCESS DENIED: SESSION REQUIRED</div>;
    }

    const handlePublishManual = async () => {
        if (!title.trim() || !content.trim()) {
            window.alert('Judul dan isi laporan wajib ada!');
            return;
        }
        setSubmitting(true);
        try {
            const response = await api.post<ContentItem>('/content/add-manual', {
                head: title,
                paragrafs: content,
                kategori: selectedKategori,
                images: buildImagePayload(images),
            });
            invalidatePublishedContentCaches(user.userID);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            handleSubmitError(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadFile = async () => {
        if (!file || !title.trim()) {
            window.alert('Pilih file dan isi judul dulu, Officer!');
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
            invalidatePublishedContentCaches(user.userID);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            handleSubmitError(error);
        } finally {
            setSubmitting(false);
        }
    };

    const submit = activeTab === 'manual' ? handlePublishManual : handleUploadFile;
    const actionDisabled = submitting || compressingImages;

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
                    <h2 className="text-2xl font-black uppercase tracking-normal text-[#e60000]">New Entry Protocol</h2>
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

                <div className="mb-6 flex gap-4">
                    <ModeButton active={activeTab === 'manual'} onClick={() => setActiveTab('manual')} icon={<FileText size={15} />} label="MANUAL INPUT" />
                    <ModeButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<Upload size={15} />} label="DOCX FILE UPLOAD" />
                </div>

                <div className="space-y-6">
                    <input
                        className="w-full border-b border-[#222] bg-transparent py-2 text-4xl font-black text-white outline-none transition-colors focus:border-[#e60000]"
                        placeholder="SUBJECT TITLE..."
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={180}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <select
                            className="cursor-pointer border border-[#333] bg-[#1a1a1a] p-3 text-xs font-bold uppercase outline-none focus:border-[#e60000]"
                            value={selectedKategori}
                            onChange={(event) => setSelectedKategori(event.target.value)}
                        >
                            {DEFAULT_CATEGORIES.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2 border border-[#333] bg-[#1a1a1a] p-3 text-[10px]">
                            <span className="text-[#666]">Author UUID:</span>
                            <span className="font-bold text-sky-500">{user.userID?.substring(0, 8)}...</span>
                        </div>
                    </div>

                    {activeTab === 'manual' ? (
                        <textarea
                            className="min-h-[460px] w-full resize-y border border-[#333] bg-[#0f0f0f] p-5 font-sans text-base leading-8 text-[#ddd] outline-none transition-colors focus:border-[#e60000]"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Input decrypted data here..."
                            maxLength={60000}
                        />
                    ) : (
                        <div className="border-2 border-dashed border-[#333] bg-[#0d0d0d] p-12 text-center transition-all hover:border-[#e60000]">
                            <input
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
                    />
                </div>
            </div>
        </div>
    );
}

function invalidatePublishedContentCaches(userId: string) {
    invalidateApiCache('/content/all-content');
    invalidateApiCache(`/content/by-user/${userId}`);
    invalidateApiCache('/content/categories');
    invalidateApiCache('/content/analytics');
}

function buildImagePayload(images: AttachedImage[]) {
    return images.map(image => ({
        data: image.data,
        alt: image.alt,
    }));
}

function ImageAttachmentPanel({
    images,
    notice,
    compressing,
    onSelect,
    onRemove,
}: {
    images: AttachedImage[];
    notice: string | null;
    compressing: boolean;
    onSelect: (files: FileList | null) => Promise<void>;
    onRemove: (id: string) => void;
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
                            <img src={image.data} alt={image.alt} className="h-32 w-full object-cover" />
                            <figcaption className="flex items-center justify-between gap-2 border-t border-[#222] px-2 py-2 text-[9px] uppercase text-[#777]">
                                <span className="truncate">{image.alt}</span>
                                <span>{formatBytes(image.size)}</span>
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
        let fallback: AttachedImage | null = null;

        for (const attempt of attempts) {
            const canvas = renderImageToCanvas(sourceImage, attempt.maxDimension);
            const blob = await canvasToBlob(canvas, 'image/webp', attempt.quality);
            const data = await blobToDataUrl(blob);
            const compressed: AttachedImage = {
                id: createClientId(),
                data,
                alt: cleanImageName(file.name),
                size: blob.size,
                originalSize: file.size,
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

function handleSubmitError(error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.alert('Sesi akses berakhir. Silakan login ulang.');
        window.location.href = '/login';
        return;
    }
    if (axios.isAxiosError(error) && error.response?.status === 423) {
        window.alert('Akun sedang disuspend sementara. Publikasi ditahan.');
        return;
    }
    window.alert('Critical Error: Gagal sinkronisasi dengan database.');
}
