import { useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, Send, Upload } from 'lucide-react';
import api, { oauthLoginUrl } from '../lib/api';
import { DEFAULT_CATEGORIES } from '../utils/categoryColors';
import type { ContentItem, CurrentUser } from '../types/forum';

export default function WritingPage({ user }: { user: CurrentUser | null }) {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [selectedKategori, setSelectedKategori] = useState('General');
    const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
    const [content, setContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
            });
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

        setSubmitting(true);
        try {
            const response = await api.post<ContentItem>('/content/upload', formData);
            navigate(`/read/${response.data.idContent}`);
        } catch (error: unknown) {
            handleSubmitError(error);
        } finally {
            setSubmitting(false);
        }
    };

    const submit = activeTab === 'manual' ? handlePublishManual : handleUploadFile;

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-4 font-mono text-[#eee] lg:p-8">
            <div className="mx-auto max-w-4xl border border-[#333] bg-[#111] p-6 shadow-2xl">
                <div className="mb-8 flex flex-col gap-4 border-b border-[#e60000] pb-4 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-2xl font-black uppercase tracking-normal text-[#e60000]">New Entry Protocol</h2>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 bg-[#e60000] px-8 py-2 font-black text-white shadow-[4px_4px_0px_#444] transition-all hover:bg-white hover:text-[#e60000] disabled:cursor-wait disabled:opacity-60"
                    >
                        {activeTab === 'manual' ? <Send size={16} /> : <Upload size={16} />}
                        {submitting ? 'PROCESSING' : activeTab === 'manual' ? 'UPLOAD DATA' : 'DECRYPT FILE'}
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
                </div>
            </div>
        </div>
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

function handleSubmitError(error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.alert('Sesi akses berakhir. Silakan login ulang.');
        window.location.href = oauthLoginUrl();
        return;
    }
    if (axios.isAxiosError(error) && error.response?.status === 423) {
        window.alert('Akun sedang disuspend sementara. Publikasi ditahan.');
        return;
    }
    window.alert('Critical Error: Gagal sinkronisasi dengan database.');
}
