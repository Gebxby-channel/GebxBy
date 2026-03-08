import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function ProfilePage({ user }: { user: any }) {
    const [contents, setContents] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ head: "", paragrafs: "", penulis: "" });
    const navigate = useNavigate();
    const API_BASE = 'http://localhost:9090/content';

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        fetchMyContents();
    }, [user, navigate]);

    const fetchMyContents = async () => {
        try {
            const res = await axios.get(`${API_BASE}/all-content`, { withCredentials: true });
            const allData = Array.isArray(res.data) ? res.data : [];
            const myData = allData.filter(item => item.penulis?.name === user.name);
            setContents(myData);
        } catch (error) {
            console.error("Gagal mengambil data", error);
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            await axios.put(`${API_BASE}/edit/${id}`, {
                head: editForm.head,
                paragrafs: editForm.paragrafs,
                penulis: { name: user.name }
            }, { withCredentials: true });
            alert("Data berhasil diperbarui!");
            setEditingId(null);
            fetchMyContents();
        } catch (error) {
            alert("Gagal memperbarui data.");
        }
    };

    const startEdit = (item: any) => {
        setEditingId(item.idContent);
        setEditForm({ head: item.head, paragrafs: item.paragrafs, penulis: item.penulis?.name });
    };

    const handleDelete = async (idContent: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus konten ini?")) {
            try {
                await axios.delete(`${API_BASE}/${idContent}`, { withCredentials: true });
                alert("Konten berhasil dihapus!");
                fetchMyContents();
            } catch (error) {
                alert("Terjadi kesalahan saat menghapus.");
            }
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
            <div className="max-w-5xl mx-auto p-6 lg:p-10">

                {/* Navigasi & Back Button */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300"
                    >
                        <div className="p-2 rounded-full bg-[#272727] group-hover:bg-[#3f3f3f]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </div>
                        <span className="font-medium">Kembali ke Beranda</span>
                    </button>
                </div>

                {/* Header Identitas Profile (YouTube Style) */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pb-10 border-b border-[#272727]">
                    <div className="relative">
                        <img
                            src={user.picture || logo}
                            alt="Profile"
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#1a1a1a] shadow-2xl ring-2 ring-red-600/30"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#0f0f0f] rounded-full"></div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">{user.name}</h1>
                        <p className="text-gray-400 text-lg mb-6 flex items-center justify-center md:justify-start gap-2">
                            <span className="bg-[#272727] px-3 py-1 rounded-md text-sm">{user.email}</span>
                            <span className="text-sm">•</span>
                            <span className="text-sm text-red-500 font-semibold">{contents.length} Tulisan</span>
                        </p>
                        <button
                            onClick={() => navigate('/write')}
                            className="bg-white text-black hover:bg-red-600 hover:text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform active:scale-95 shadow-lg shadow-white/5"
                        >
                            + Buat Tulisan Baru
                        </button>
                    </div>
                </div>

                {/* Daftar Tulisan Pribadi */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold border-l-4 border-red-600 pl-4 uppercase tracking-widest">Koleksi Tulisan</h2>
                        <div className="h-px flex-1 bg-[#272727] ml-6 hidden md:block"></div>
                    </div>

                    {contents.length === 0 ? (
                        <div className="text-center py-20 bg-[#1a1a1a] rounded-3xl border border-dashed border-[#333]">
                            <p className="text-gray-500 text-lg">Ruang hampa... Kamu belum punya tulisan.</p>
                            <button onClick={() => navigate('/write')} className="text-red-500 hover:underline mt-2">Mulai ceritamu sekarang</button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {contents.map((item) => (
                                <div
                                    key={item.idContent}
                                    className="group relative bg-[#1a1a1a] border border-[#272727] p-6 rounded-2xl hover:border-red-600/50 transition-all duration-300"
                                >
                                    {editingId === item.idContent ? (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                            <input
                                                className="w-full bg-[#272727] border border-[#333] rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all"
                                                value={editForm.head}
                                                onChange={(e) => setEditForm({...editForm, head: e.target.value})}
                                            />
                                            <textarea
                                                className="w-full h-32 bg-[#272727] border border-[#333] rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-red-600 transition-all resize-none"
                                                value={editForm.paragrafs}
                                                onChange={(e) => setEditForm({...editForm, paragrafs: e.target.value})}
                                            />
                                            <div className="flex gap-3">
                                                <button onClick={() => handleUpdate(item.idContent)} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold transition-all">Simpan</button>
                                                <button onClick={() => setEditingId(null)} className="bg-[#333] hover:bg-[#444] px-6 py-2 rounded-full font-bold transition-all">Batal</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold mb-2 group-hover:text-red-500 transition-colors">{item.head}</h3>
                                                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed italic">
                                                    "{item.paragrafs.substring(0, 150)}..."
                                                </p>
                                            </div>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button
                                                    onClick={() => startEdit(item)}
                                                    className="flex-1 md:flex-none bg-[#272727] hover:bg-blue-600 text-white px-5 py-2 rounded-xl transition-all duration-300 font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.idContent)}
                                                    className="flex-1 md:flex-none bg-[#272727] hover:bg-red-600 text-white px-5 py-2 rounded-xl transition-all duration-300 font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}