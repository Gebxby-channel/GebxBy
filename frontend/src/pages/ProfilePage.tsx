import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function ProfilePage({ user }: { user: any }) {
    const [contents, setContents] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ head: "", paragrafs: "", user: "" });
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
            const myData = allData.filter(item => item.user?.name === user.name);
            setContents(myData);
        } catch (error) {
            console.error("Gagal mengambil data", error);
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            await axios.put(`${API_BASE}/edit/${id}`, {
                head: editForm.head,
                paragrafs: editForm.paragrafs
            }, { withCredentials: true });

            alert("Tulisan berhasil diperbarui!");
            setEditingId(null);
            fetchMyContents();
        } catch (error) {
            alert("Gagal memperbarui data.");
        }
    };

    const startEdit = (item: any) => {
        setEditingId(item.idContent);
        setEditForm({
            head: item.head,
            paragrafs: item.paragrafs,
            user: item.user?.name
        });
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

    const handleLogout = () => {
        window.location.href = 'http://localhost:9090/logout';
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white font-sans selection:bg-red-900/30">
            <div className="max-w-5xl mx-auto p-6 lg:p-10">

                {/* TOP NAVIGATION BAR - RAPID & CLEAN */}
                <div className="flex justify-between items-center mb-12">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-3 text-gray-400 hover:text-white transition-all"
                    >
                        <div className="p-2 rounded-full bg-[#1a1a1a] border border-[#272727] group-hover:bg-red-600 group-hover:border-red-600 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold tracking-widest uppercase">Beranda</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-500 hover:text-red-500 border border-[#272727] hover:border-red-500/50 px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all uppercase group"
                    >
                        <span>Logout</span>
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>

                {/* PROFILE HEADER */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 pb-12 border-b border-[#1a1a1a]">
                    <div className="relative">
                        <img
                            src={user.picture || logo}
                            alt="Profile"
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#1a1a1a] shadow-2xl ring-1 ring-[#272727]"
                            referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#0f0f0f] rounded-full"></div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-5xl font-black mb-3 tracking-tighter italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                            {user.name}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
                            <span className="bg-[#1a1a1a] border border-[#272727] px-4 py-1 rounded-full text-xs font-medium text-gray-400">
                                {user.email}
                            </span>
                            <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">
                                {contents.length} Articles Published
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/write')}
                            className="bg-red-600 text-white hover:bg-white hover:text-black font-black py-3 px-10 rounded-full transition-all transform active:scale-95 shadow-xl shadow-red-900/20 text-sm tracking-widest uppercase"
                        >
                            + New Entry
                        </button>
                    </div>
                </div>

                {/* CONTENT LIST */}
                <div className="space-y-8">
                    <h2 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em] mb-8">Archive Directory</h2>
                    {contents.length === 0 ? (
                        <div className="text-center py-24 bg-[#0a0a0a] rounded-3xl border border-dashed border-[#222]">
                            <p className="text-gray-600 font-medium italic">Database is empty. No logs found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {contents.map((item) => (
                                <div key={item.idContent} className="group bg-[#111] border border-[#1a1a1a] p-8 rounded-3xl hover:border-red-600/30 transition-all duration-500 shadow-sm hover:shadow-red-900/5">
                                    {editingId === item.idContent ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <input className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl p-4 text-white outline-none focus:border-red-600 transition-all" value={editForm.head} onChange={(e) => setEditForm({...editForm, head: e.target.value})} />
                                            <textarea className="w-full h-48 bg-[#0a0a0a] border border-[#222] rounded-2xl p-4 text-white outline-none focus:border-red-600 transition-all resize-none" value={editForm.paragrafs} onChange={(e) => setEditForm({...editForm, paragrafs: e.target.value})} />
                                            <div className="flex gap-3">
                                                <button onClick={() => handleUpdate(item.idContent)} className="bg-red-600 hover:bg-red-700 px-8 py-2 rounded-full font-bold transition-all text-xs tracking-widest">SAVE</button>
                                                <button onClick={() => setEditingId(null)} className="bg-[#222] hover:bg-[#333] px-8 py-2 rounded-full font-bold transition-all text-xs tracking-widest">CANCEL</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-bold mb-4 group-hover:text-red-600 transition-colors duration-300 tracking-tight">{item.head}</h3>
                                                <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-6 font-medium">
                                                    {item.paragrafs}
                                                </p>
                                                <div className="flex items-center gap-4">
                                                    <div className="px-3 py-1 bg-red-600/10 rounded-md">
                                                        <span className="text-[10px] text-red-600 font-black uppercase tracking-widest">Authorized</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">ID: {item.idContent.substring(0,8)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto">
                                                <button onClick={() => startEdit(item)} className="flex-1 md:flex-none bg-[#1a1a1a] hover:bg-white hover:text-black text-white px-6 py-2 rounded-full border border-[#272727] transition-all text-[10px] font-black uppercase tracking-widest">Edit</button>
                                                <button onClick={() => handleDelete(item.idContent)} className="flex-1 md:flex-none bg-[#1a1a1a] hover:bg-red-600 text-white px-6 py-2 rounded-full border border-[#272727] hover:border-red-600 transition-all text-[10px] font-black uppercase tracking-widest">Delete</button>
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