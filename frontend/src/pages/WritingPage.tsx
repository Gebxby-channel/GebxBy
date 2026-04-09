import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface UserProps {
    name: string;
    email: string;
    picture?: string;
    userID: string;
}

export default function WritingPage({ user }: { user: UserProps | null }) {
    const navigate = useNavigate();
    const API_BASE = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/content';

    // State Umum
    const [title, setTitle] = useState("");
    const [selectedKategori, setSelectedKategori] = useState("General");
    const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');

    // State Manual Entry
    const [content, setContent] = useState("");

    // State File Upload
    const [file, setFile] = useState<File | null>(null);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['code-block', 'link'],
            ['clean']
        ],
    };

    if (!user) return <div className="text-white text-center mt-20 font-mono italic">ACCESS DENIED: SESSION REQUIRED</div>;

    const handlePublishManual = async () => {
        if (!title || !content) return alert("Judul dan isi laporan wajib ada!");

        try {
            // 1. Verifikasi Session
            const userRes = await axios.get('https://federal-wasp-gebxby-18a594b4.koyeb.app/api/user/me', { withCredentials: true });

            if (userRes.status === 200) {
                const activeUser = userRes.data;

                // 2. Publish Data (Mengirimkan userID Google sebagai String)
                await axios.post(`${API_BASE}/add-manual`, {
                    head: title,
                    paragrafs: content, // HTML dari Quill
                    kategori: selectedKategori,
                    user: {
                        name: activeUser.name,
                        email: activeUser.email,
                        // userID: activeUser.userID
                        // Kunci utama biar gak 400 Bad Request
                    }
                }, { withCredentials: true });

                alert("tulisan berhasil di tambahkan dengan kaetgori: " + selectedKategori);
                navigate('/profile/' + activeUser.userID);
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                alert("Sesi akses berakhir. Silakan login ulang, Officer!");
                window.location.href = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/oauth2/authorization/google';
            } else {
                alert("Critical Error: Gagal sinkronisasi dengan database.");
            }
        }
    };

    // FUNGSI 2: UPLOAD FILE DOCX
    const handleUploadFile = async () => {
        if (!file || !title) return alert("Pilih file dan isi judul dulu, Officer!");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("kategori", selectedKategori);
        formData.append("author", user.name);

        try {
            await axios.post(`${API_BASE}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            alert("Document Decrypted and Uploaded!");
            navigate('/profile/' + user.userID);
        } catch (err) {
            alert("Failed to process document file.");
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#eee] font-mono p-4 lg:p-8">
            <div className="max-w-4xl mx-auto border border-[#333] bg-[#111] p-6 shadow-2xl">

                {/* Header (Underscore Removed) */}
                <div className="flex justify-between items-center mb-8 border-b border-[#e60000] pb-4">
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-[#e60000]">New Entry Protocol</h2>
                    <button
                        onClick={activeTab === 'manual' ? handlePublishManual : handleUploadFile}
                        className="bg-[#e60000] hover:bg-white hover:text-[#e60000] text-white px-8 py-2 font-black transition-all shadow-[4px_4px_0px_#444]"
                    >
                        {activeTab === 'manual' ? "UPLOAD DATA" : "DECRYPT FILE"}
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-2 text-xs font-bold border ${activeTab === 'manual' ? 'bg-[#e60000] border-[#e60000] text-white' : 'border-[#333] text-[#666]'} transition-all`}
                    >
                        MANUAL INPUT
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-2 text-xs font-bold border ${activeTab === 'upload' ? 'bg-[#e60000] border-[#e60000] text-white' : 'border-[#333] text-[#666]'} transition-all`}
                    >
                        DOCX FILE UPLOAD
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Common Title Input */}
                    <input
                        className="w-full bg-transparent text-4xl font-black outline-none border-b border-[#222] focus:border-sky-600 transition-colors py-2"
                        placeholder="SUBJECT TITLE..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <select
                            className="bg-[#1a1a1a] border border-[#333] p-3 text-xs font-bold uppercase outline-none focus:border-sky-600 cursor-pointer"
                            value={selectedKategori}
                            onChange={(e) => setSelectedKategori(e.target.value)}
                        >
                            <option value="Lore">Lore</option>
                            <option value="Speculation">Speculation</option>
                            <option value="Analistic Pshycologic">Analytic Psychological</option>
                            <option value="Fan-Novel">Fan-Novel</option>
                        </select>
                        <div className="bg-[#1a1a1a] border border-[#333] p-3 text-[10px] flex items-center gap-2">
                            <span className="text-[#666]">Author UUID:</span>
                            <span className="text-sky-500 font-bold">{user.userID?.substring(0,8)}...</span>
                        </div>
                    </div>

                    {activeTab === 'manual' ? (
                        /* Manual Entry Section */
                        <div className="quill-container bg-[#0f0f0f]">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                modules={modules}
                                placeholder="Input decrypted data here..."
                            />
                        </div>
                    ) : (
                        /* File Upload Section */
                        <div className="border-2 border-dashed border-[#333] p-12 text-center bg-[#0d0d0d] hover:border-[#e60000] transition-all group">
                            <input
                                type="file"
                                accept=".docx"
                                id="fileInput"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            />
                            <label htmlFor="fileInput" className="cursor-pointer">
                                <p className="text-[#666] text-sm group-hover:text-white transition-colors">
                                    {file ? `File Selected: ${file.name}` : "DRAG AND DROP OR CLICK TO SELECT .DOCX FILE"}
                                </p>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .ql-toolbar.ql-snow { border: 1px solid #333; background: #222; }
                .ql-container.ql-snow { border: 1px solid #333; height: 450px; font-size: 16px; color: #ddd; }
                .ql-editor.ql-blank::before { color: #444; font-style: normal; }
                .ql-snow .ql-stroke { stroke: #aaa; }
                .ql-snow .ql-fill { fill: #aaa; }
                .ql-snow .ql-picker { color: #aaa; }
            `}</style>
        </div>
    );
}