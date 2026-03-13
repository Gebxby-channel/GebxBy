import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/S.T.A.R.S._logo.webp';
// import {Input} from "postcss";
// import logo from '../assets/logo.png'; // Pastikan logo kamu diimport di sini

export default function ProfilePage({ user }: { user: any }) {
    const [contents, setContents] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ head: "", paragrafs: "", kategori: "" });
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
                paragrafs: editForm.paragrafs,
                kategori: editForm.kategori
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
        setEditForm({
            head: item.head,
            paragrafs: item.paragrafs,
            kategori: item.kategori || ""
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

    const getBadgeStyle = (cat: string) => {
        switch(cat) {
            case 'General' : return 'bg-yellow-600/20 text-blue-400 border border-blue-600/30'
            case 'Fan-Novel': return 'bg-blue-600/20 text-blue-400 border border-blue-600/30';
            case 'Lore': return 'bg-red-600/20 text-red-500 border border-red-600/30';
            case 'Analistic Pshycologic': return 'bg-pink-600/20 text-red-500 border border-red-600/30';
            case 'Speculation': return 'bg-purple-600/20 text-purple-400 border border-purple-600/30';
            case 'QnA': return 'bg-orange-600/20 text-orange-400 border border-orange-600/30';
            default: return 'bg-gray-600/20 text-gray-400 border border-gray-600/30';
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white font-mono p-6 lg:p-10">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300">
                        <div className="p-2 rounded-full bg-[#272727] group-hover:bg-[#3f3f3f]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </div>
                        <span className="font-medium">Kembali ke Beranda</span>
                    </button>
                </div>

                {/* --- START: S.T.A.R.S. ID CARD PROFILE SECTION --- */}
                <div className="relative w-full max-w-3xl mx-auto aspect-[1.58/1] bg-white rounded-[40px] overflow-hidden flex shadow-2xl ">

                    {/* LEFT BLUE PANEL: LOGO AREA */}
                    <div className="w-[40%] bg-[#1a3a63] flex flex-col items-center justify-center p-6 border-r-4 border-white">
                        {/* TEMPAT LOGO S.T.A.R.S (Ganti 'src' dengan path logo kamu) */}
                        <div className="w-full aspect-square flex items-center justify-center">
                            <img
                                src={logo}
                                alt="S.T.A.R.S. Logo"
                                className="w-[85%] object-contain"
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <h2 className="text-white text-xl font-black leading-tight tracking-tighter">SPECIAL TACTICS AND RESCUE SERVICE</h2>
                        </div>
                    </div>

                    {/* RIGHT WHITE PANEL: USER DATA AREA */}
                    <div className="flex-1 bg-white p-6 flex flex-col relative text-[#1a3a63]">
                        {/* Header Depan */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex flex-col">
                                <h1 className="text-5xl font-black tracking-tighter">POLICE</h1>
                                <p className="text-xl font-bold mt-[-8px]">RACCOON POLICE DEP.</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                {/* TEMPAT LOGO R.P.D KECIL (Opsional) */}
                                <div className="w-12 h-12 bg-gray-200 rounded-full mb-1"></div>
                            </div>
                        </div>

                        {/* Data Fields */}
                        <div className="space-y-6 mt-4">
                            <div className="border-b-2 border-[#1a3a63] pb-1 relative">
                                <span className="text-1xl font-bold block uppercase font-['MyCustomFont']" >{user.name}</span>
                                <span className="absolute -bottom-5 right-0 text-[10px] font-bold opacity-70">name</span>
                            </div>
                            <div className="border-b-2 border-[#1a3a63] pb-1 relative">
                                <span className="text-2xl font-bold block uppercase tracking-wide">//BUAT AGAR USER BISA MASUKKAN SENDIRI</span>
                                <span className="absolute -bottom-5 right-0 text-[10px] font-bold opacity-70">asignation</span>
                            </div>
                        </div>

                        {/* Photo & Signature Row */}
                        <div className="flex mt-10 items-end justify-between">
                            {/* USER PHOTO - BOXED AS IN SCREENSHOT */}
                            <div className="w-32 h-40 border-2 border-gray-300 bg-gray-100 p-1 shadow-inner relative">
                                <img
                                    src={user.picture}
                                    alt="Officer"
                                    className="w-full h-full object-cover grayscale"
                                    referrerPolicy="no-referrer"
                                />
                                <span className="absolute -top-6 left-0 text-[10px] font-bold opacity-70">placeholder foto</span>
                            </div>

                            {/* SIGNATURE & LEGAL TEXT */}
                            <div className="flex-1 ml-8 flex flex-col items-end">
                                <div className="text-center w-full max-w-[200px]">
                                    <div className="font-serif italic text-3xl border-b border-[#1a3a63] pb-1 mb-1 leading-none">
                                        {user.name?.split(' ')[0]}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase">chief of studio</span>
                                </div>
                                <div className="mt-4 text-[7px] text-right leading-tight font-bold opacity-60">
                                    SUCH MAY MAKE ARRESTS. CARRY FIREARMS, CARRY OUT INVESTIGATIONS AND PERFORM OTHER LAW ENFORCEMENT DUTIES AS APPROVED BY FEDERAL LAW AND REGULATION.
                                </div>
                            </div>
                        </div>

                        {/* Vertically oriented text sidebar (S.T.A.R.S text on image) */}
                        <div className="absolute left-0 bottom-1/2 translate-y-1/2 -rotate-90 origin-left text-[8px] font-bold tracking-[0.2em] opacity-40 ml-2">
                            SPECIAL TACTICS AND RESCUE SERVICE
                        </div>
                    </div>
                </div>
                {/* --- END: S.T.A.R.S. ID CARD PROFILE SECTION --- */}

                {/* Bagian Actions */}
                <div className="flex justify-center mb-12">
                    <button onClick={() => navigate('/write')} className="bg-red-600 text-white hover:bg-white hover:text-black font-black py-4 px-10 rounded-none transform skew-x-[-12deg] transition-all duration-300 shadow-[4px_4px_0px_white]">
                        + BUAT TULISAN BARU
                    </button>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold border-l-4 border-red-600 pl-4 uppercase tracking-widest mb-8">Koleksi Tulisan</h2>
                    {contents.length === 0 ? (
                        <div className="text-center py-20 bg-[#1a1a1a] rounded-3xl border border-dashed border-[#333]">
                            <p className="text-gray-500 text-lg">Kamu belum punya tulisan.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {contents.map((item) => (
                                <div key={item.idContent} className="group relative bg-[#1a1a1a] border border-[#272727] p-6 rounded-2xl hover:border-red-600/50 transition-all duration-300">
                                    {editingId === item.idContent ? (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                            <input className="w-full bg-[#272727] border border-[#333] rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-red-600" value={editForm.head} onChange={(e) => setEditForm({...editForm, head: e.target.value})} />
                                            <select
                                                className="w-full bg-[#272727] border border-[#333] rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-red-600"
                                                value={editForm.kategori}
                                                onChange={(e) => setEditForm({...editForm, kategori: e.target.value})}
                                            >
                                                <option value="General">General</option>
                                                <option value="Fan-Novel">Fan-Novel</option>
                                                <option value="Speculation">Spekulasi & Teori</option>
                                                <option value="Analistic Pshycologic">Analistic Pshycologic</option>
                                                <option value="Lore">Lore</option>
                                                <option value="QnA">Q&A</option>
                                            </select>
                                            <textarea className="w-full h-32 bg-[#272727] border border-[#333] rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-red-600 resize-none" value={editForm.paragrafs} onChange={(e) => setEditForm({...editForm, paragrafs: e.target.value})} />
                                            <div className="flex gap-3">
                                                <button onClick={() => handleUpdate(item.idContent)} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full font-bold transition-all">Simpan</button>
                                                <button onClick={() => setEditingId(null)} className="bg-[#333] hover:bg-[#444] px-6 py-2 rounded-full font-bold transition-all">Batal</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold group-hover:text-red-500 transition-colors">{item.head}</h3>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${getBadgeStyle(item.kategori)}`}>
                                                        {item.kategori}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed italic">"{item.paragrafs.substring(0, 150)}..."</p>
                                            </div>
                                            <div className="flex gap-3 w-full md:w-auto">
                                                <button onClick={() => startEdit(item)} className="flex-1 md:flex-none bg-[#272727] hover:bg-blue-600 text-white px-5 py-2 rounded-xl transition-all duration-300 font-medium">Edit</button>
                                                <button onClick={() => handleDelete(item.idContent)} className="flex-1 md:flex-none bg-[#272727] hover:bg-red-600 text-white px-5 py-2 rounded-xl transition-all duration-300 font-medium">Hapus</button>
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