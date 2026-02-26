import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
    // const [file, setFile] = useState<File | null>(null);
    // const [title, setTitle] = useState<string>("");
    const [contents, setContents] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ head: "", paragrafs: "" });
    useNavigate();
    const API_BASE = 'http://localhost:9090/content';
    const navigate = useNavigate();

    const fetchContents = async () => {
        try {
            const res = await axios.get(`${API_BASE}/all-content`);
            setContents(Array.isArray(res.data) ? res.data : []); //
        } catch (error) {
            console.error("Gagal mengambil data", error);
        }
    };

    useEffect(() => {
        fetchContents();
    }, []);

    // const handleUpload = async () => {
    //     if (!file || !title) {
    //         alert("Isi judul dan pilih file dulu ya!");
    //         return;
    //     }
    //
    //     const formData = new FormData();
    //     formData.append('file', file);
    //     formData.append('title', title);
    //
    //     try {
    //         await axios.post(`${API_BASE}/upload`, formData, {
    //             headers: { 'Content-Type': 'multipart/form-data' }
    //         });
    //         alert("Upload Sukses!");
    //         setTitle("");
    //         setFile(null);
    //         fetchContents();
    //     } catch (error) {
    //         console.error("Error detail:", error);
    //         alert("Terjadi kesalahan saat upload.");
    //     }
    // };


    const handleUpdate = async (id: string) => {
        try {

            await axios.put(`${API_BASE}/edit/${id}`, {
                head: editForm.head,
                paragrafs: editForm.paragrafs
            });
            alert("Data berhasil diperbarui!");
            setEditingId(null);
            fetchContents(); // Refresh data
        } catch (error) {
            console.error("Gagal update data", error);
            alert("Gagal memperbarui data.");
        }
    };


    const startEdit = (item: any) => {
        setEditingId(item.idContent);
        setEditForm({ head: item.head, paragrafs: item.paragrafs });
    };
    const handleDelete = async (idContent: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus konten ini?")) {
            try {
                await axios.delete(`${API_BASE}/${idContent}`);
                alert("Konten berhasil dihapus!");
                fetchContents();
            } catch (error) {
                console.error("Gagal menghapus", error);
                alert("Terjadi kesalahan saat menghapus.");
            }
        }
    };
    return (
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
            <h1>Admin Dashboard - Upload Content</h1>
            <button
                onClick={() => navigate('/write')}
                style={{ backgroundColor: '#8B0000', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                Buat Tulisan
            </button>

            <h2>Daftar Konten Terunggah</h2>
            <div style={{ marginTop: '20px' }}>
                {contents.map((item) => (
                    <div key={item.idContent} style={{ border: '1px solid #444', padding: '15px', marginBottom: '10px', borderRadius: '8px' }}>
                        {editingId === item.idContent ? (

                            <div>
                                <input
                                    value={editForm.head}
                                    onChange={(e) => setEditForm({...editForm, head: e.target.value})}
                                    style={{ width: '100%', marginBottom: '10px', padding: '5px' }}
                                />
                                <textarea
                                    value={editForm.paragrafs}
                                    onChange={(e) => setEditForm({...editForm, paragrafs: e.target.value})}
                                    style={{ width: '100%', height: '100px', marginBottom: '10px', padding: '5px' }}
                                />
                                <button onClick={() => handleUpdate(item.idContent)} style={{ marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 15px', cursor: 'pointer' }}>Simpan</button>
                                <button onClick={() => setEditingId(null)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 15px', cursor: 'pointer' }}>Batal</button>
                            </div>
                        ) : (

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{item.head}</h3>
                                    <p style={{ color: '#aaa', fontSize: '12px' }}>ID: {item.idContent}</p>
                                </div>
                                <button
                                    onClick={() => startEdit(item)}
                                    style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Edit Konten
                                </button>
                                <button
                                    onClick={() => handleDelete(item.idContent)}
                                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}