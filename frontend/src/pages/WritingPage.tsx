import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function WritingPage({ user }: { user: any })  {
    const [mode, setMode] = useState<'manual' | 'upload'>('manual');
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();

    const API_BASE = 'http://localhost:9090/content';

    const handlePublishManual = async () => {
        if (!title || !content) return alert("Judul dan isi tulisan wajib ada!");
        try {
            await axios.post(`${API_BASE}/add-manual`, {
                head: title,       // Sesuaikan dengan Content.java
                paragrafs: content, // Sesuaikan dengan Content.java
                user: { name: user?.name || "Anonymous" } // Sesuaikan dengan Content.java
            }, { withCredentials: true });

            alert("Tulisan berhasil di-publish!");
            navigate('/profile');
        } catch (err) {
            console.error(err);
            alert("Gagal publish manual.");
        }
    };

    const handleUploadFile = async () => {
        if (!file || !title) return alert("Pilih file dan isi judul!");
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('author', user?.name || "Anonymous");
        try {
            await axios.post(`${API_BASE}/upload`, formData, { withCredentials: true });
            alert("File Docx berhasil di-upload!");
            navigate('/profile');
        } catch (err) {
            console.error(err);
            alert("Gagal upload file.");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-red-900/30">
            {/* Header / Tabs */}
            <nav className="max-w-4xl mx-auto flex items-center justify-between p-6 border-b border-[#272727]">
                <div className="flex gap-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-gray-500 hover:text-red-600 transition-all duration-300 group"
                    >
                        {/* Icon Panah Kecil */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        Beranda
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`text-sm font-bold tracking-widest uppercase transition-all ${mode === 'manual' ? 'text-white border-b-2 border-red-600 pb-1' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setMode('upload')}
                        className={`text-sm font-bold tracking-widest uppercase transition-all ${mode === 'upload' ? 'text-white border-b-2 border-red-600 pb-1' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Upload Docx
                    </button>
                </div>

                <button
                    onClick={mode === 'manual' ? handlePublishManual : handleUploadFile}
                    className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded-full font-bold text-sm transition-all transform active:scale-95"
                >
                    {mode === 'manual' ? 'PUBLISH' : 'UPLOAD'}
                </button>
            </nav>

            <main className="max-w-3xl mx-auto mt-12 px-4 pb-20">
                {mode === 'manual' ? (
                    <div className="animate-in fade-in duration-700">
                        {/* Title Input */}
                        <input
                            className="w-full bg-transparent text-5xl font-bold outline-none placeholder-gray-800 mb-8 border-none focus:ring-0"
                            placeholder="Judul Cerita..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        {/* Author Meta */}
                        <div className="flex items-center gap-4 mb-10 p-3 bg-[#1a1a1a] rounded-xl border border-[#272727]">
                            <img
                                src={user?.picture || "https://via.placeholder.com/150"}
                                alt="Author"
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-red-900/20"
                            />
                            <div>
                                <p className="text-sm text-gray-400">Menulis sebagai</p>
                                <p className="font-bold text-white leading-tight">{user?.name || "Guest User"}</p>
                            </div>
                        </div>

                        {/* Content Area */}
                        <textarea
                            className="w-full bg-transparent text-xl leading-relaxed text-gray-300 outline-none resize-none min-h-[600px] placeholder-gray-700 focus:ring-0"
                            placeholder="tulis disini..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-3xl animate-in zoom-in-95 duration-500">
                        <div className="mb-6 bg-red-600/10 p-6 rounded-full">
                            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-center">Upload File Docx</h2>
                        <p className="text-gray-500 mb-8 text-center px-6">Sistem akan otomatis mengambil teks dari dokumenmu.</p>

                        <div className="w-full max-w-md px-8 space-y-4">
                            <input
                                type="text"
                                placeholder="Tentukan Judul"
                                className="w-full bg-[#0f0f0f] border border-[#333] p-4 rounded-xl focus:border-red-600 outline-none transition-all"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />

                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#333] border-dashed rounded-xl cursor-pointer hover:bg-[#222] transition-all">
                                <span className="text-sm text-gray-500">{file ? file.name : "Klik untuk pilih berkas"}</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}