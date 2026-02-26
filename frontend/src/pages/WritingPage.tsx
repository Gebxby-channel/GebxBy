import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function WritingPage() {
    const [mode, setMode] = useState<'manual' | 'upload'>('manual');
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [author, setAuthor] = useState("");
    const [authorPhoto] = useState<File | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const navigate = useNavigate();

    const API_BASE = 'http://localhost:9090/content';

    const handlePublishManual = async () => {
        if (!title || !content) return alert("Judul dan isi tulisan wajib ada!");
        try {
            // Kita kirim sebagai JSON untuk mode manual
            await axios.post(`${API_BASE}/add-manual`, {
                head: title,
                paragrafs: content,
                authorName: author || "Anonymous"
            });
            alert("Tulisan berhasil di-publish!");
            navigate('/');
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
        try {
            await axios.post(`${API_BASE}/upload`, formData);
            alert("File Docx berhasil di-upload!");
            navigate('/');
        } catch (err) {
            alert("Gagal upload file.");
        }
    };

    return (
        <div className="writing-container">
            <div className="writing-header">
                <button onClick={() => setMode('manual')} className={mode === 'manual' ? 'active' : ''}>Writing</button>
                <button onClick={() => setMode('upload')} className={mode === 'upload' ? 'active' : ''}>Upload</button>
            </div>

            {mode === 'manual' ? (
                <div className="wattpad-editor">
                    <input
                        className="title-input"
                        placeholder="Judul..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="author-meta">
                        <div className="photo-placeholder">
                            {authorPhoto ? "Photo Selected" : "No Photo"}
                        </div>
                        <input
                            placeholder="Nama Penulis"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                        />
                    </div>

                    <textarea
                        className="content-area"
                        placeholder="Mulai menulis di sini..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    <button className="btn-publish" onClick={handlePublishManual}>PUBLISH_LOG</button>
                </div>
            ) : (
                <div className="upload-section">
                    <h2>Upload Berkas (.docx)</h2>
                    <input type="text" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <button onClick={handleUploadFile}>UPLOAD_TO_SYSTEM</button>
                </div>
            )}
        </div>
    );
}