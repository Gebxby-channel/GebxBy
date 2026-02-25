import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
export default function AdminPage() {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState<string>("");
    const navigate = useNavigate();

    const handleUpload = async () => {
        if (!file || !title) {
            alert("Isi judul dan pilih file dulu ya!");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);

        try {
            await axios.post('http://localhost:9090/content/upload', formData);
            alert("Upload Sukses!");

            navigate('/'); // 3. Pindah ke HomePage setelah sukses
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Admin Dashboard - Upload Content</h1>
            <input
                type="text"
                placeholder="Judul"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <br /><br />
            {/* Solusi error TS18047 ada di sini */}
            <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <br /><br />
            <button onClick={handleUpload}>Publish</button>
        </div>
    );
}