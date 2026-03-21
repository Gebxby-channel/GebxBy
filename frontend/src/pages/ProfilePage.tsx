import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/S.T.A.R.S._logo.webp';

export default function ProfilePage({ user }: { user: any }) {
    const [contents, setContents] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ head: "", paragrafs: "", kategori: "" });
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest'); // State Sortir

    const [designation, setDesignation] = useState(() => {
        return localStorage.getItem('user_designation') || "RECONNAISSANCE OFFICER";
    });

    const navigate = useNavigate();
    const API_BASE = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/content';

    // Helper format tanggal (Gaya S.T.A.R.S)
    const formatDate = (dateString: string) => {
        if (!dateString) return "NO DATA";
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).toUpperCase();
    };

    // SATUIN EFFECT: Cukup satu yang dengerin user & sortOrder
    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        fetchMyContents();
        localStorage.setItem('user_designation', designation);
    }, [user, sortOrder, designation, navigate]);

    const fetchMyContents = async () => {
        try {
            const res = await axios.get(`${API_BASE}/all-content`, { withCredentials: true });
            const allData = Array.isArray(res.data) ? res.data : [];

            // Filter hanya punya Gebi
            let myData = allData.filter(item => item.user?.name === user.name);

            // LOGIKA SORTIR TANGGAL
            myData.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });

            setContents(myData);
        } catch (error) {
            console.error("Gagal sinkronisasi arsip:", error);
        }
    };

    const handleUpdate = async (id: string) => {
        try {
            await axios.put(`${API_BASE}/edit/${id}`, {
                head: editForm.head,
                paragrafs: editForm.paragrafs,
                kategori: editForm.kategori
            }, { withCredentials: true });
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
        if (window.confirm("WARNING: Data removal is permanent. Proceed?")) {
            try {
                await axios.delete(`${API_BASE}/${idContent}`, { withCredentials: true });
                fetchMyContents();
            } catch (error) {
                alert("Critical Error during deletion.");
            }
        }
    };

    const getBadgeStyle = (cat: string) => {
        switch(cat) {
            case 'Lore': return 'border-[#e60000] text-[#e60000] bg-[#e60000]/10';
            case 'Analistic Pshycologic': return 'border-pink-600 text-pink-500 bg-pink-600/10';
            default: return 'border-[#444] text-[#888] bg-[#1a1a1a]';
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#111] text-[#eee] font-mono p-6 lg:p-10">
            <div className="max-w-[1600px] mx-auto">

                {/* Navigation */}
                <div className="mb-10 border-b border-[#2a2a2a] pb-4">
                    <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#888] hover:text-[#e60000] transition-all duration-300">
                        <span className="font-bold tracking-widest text-xs uppercase">{"<"} Back to Command Center</span>
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-10 items-start">

                    {/* === KOLOM KIRI: ID CARD === */}
                    <div className="w-full lg:w-[380px] flex-shrink-0 lg:sticky lg:top-28">
                        <p className="text-[10px] text-[#444] mb-3 tracking-[0.3em] uppercase pl-2">Personnel Side ID</p>
                        <div className="relative w-full aspect-[1.58/1] bg-white rounded-xl overflow-hidden flex shadow-2xl border border-[#2a2a2a] scale-95 origin-top-left">
                            <div className="w-[40%] bg-[#1a3a63] flex flex-col items-center justify-center p-4 border-r-[3px] border-white">
                                <img src={logo} alt="S.T.A.R.S. Logo" className="w-[85%] object-contain" />
                                <h2 className="text-white text-[5px] font-black leading-tight tracking-tighter text-center mt-3 uppercase">Special Tactics and Rescue Service</h2>
                            </div>

                            <div className="flex-1 bg-white p-4 flex flex-col relative text-[#1a3a63]">
                                <h1 className="text-3xl font-black tracking-tighter leading-none">POLICE</h1>
                                <p className="text-[11px] font-bold">RACCOON POLICE DEP.</p>

                                <div className="space-y-4 mt-2">
                                    <div className="border-b border-[#1a3a63] pb-0.5 relative">
                                        <span className="text-sm font-black block uppercase truncate">{user.name}</span>
                                        <span className="absolute -bottom-3 right-0 text-[6px] font-bold opacity-60 uppercase">Officer Name</span>
                                    </div>
                                    <div className="border-b border-[#1a3a63] pb-0.5 relative">
                                        <input
                                            type="text"
                                            value={designation}
                                            onChange={(e) => setDesignation(e.target.value.toUpperCase())}
                                            className="w-full bg-transparent text-xs font-black uppercase tracking-tight outline-none focus:text-red-600 transition-colors"
                                        />
                                        <span className="absolute -bottom-3 right-0 text-[6px] font-bold opacity-60 uppercase">Asignation</span>
                                    </div>
                                </div>

                                <div className="flex mt-5 items-end justify-between">
                                    <div className="w-16 h-20 border border-[#1a3a63] bg-gray-100 p-0.5 shadow-md">
                                        <img src={user.picture} alt="Officer" className="w-full h-full object-cover grayscale contrast-125" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="flex-1 ml-3 flex flex-col items-end">
                                        <div className="text-center w-full max-w-[100px]">
                                            <div className="font-serif italic text-sm border-b border-[#1a3a63] pb-0.5 mb-0.5 truncate">GEBXBY</div>
                                            <span className="text-[7px] font-black uppercase">Authorized Signature</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* === KOLOM KANAN: ARSIP === */}
                    <div className="flex-1 w-full">
                        {/* HEADER ACTIONS + DROPDOWN SORTIR */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-[#2a2a2a] pb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-widest">Personal Archives</h2>
                                <p className="text-[#888] text-xs font-mono">Managing {contents.length} secure data entries within this sector.</p>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {/* INI DROPDOWN YANG TADI HILANG GEB! */}
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className="bg-[#111] border border-[#333] text-[#e60000] text-[10px] font-bold p-3 uppercase outline-none focus:border-[#e60000] cursor-pointer"
                                >
                                    <option value="newest">Newest Entry</option>
                                    <option value="oldest">Oldest Entry</option>
                                </select>

                                <button
                                    onClick={() => navigate('/write')}
                                    className="bg-[#e60000] text-white hover:bg-white hover:text-[#e60000] font-black py-3 px-8 transition-all duration-300 uppercase text-xs tracking-tighter shadow-[4px_4px_0px_#444] whitespace-nowrap flex-1 md:flex-none"
                                >
                                    + Create New Entry
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {contents.length === 0 ? (
                                <div className="text-center py-20 border border-dashed border-[#2a2a2a] text-[#444] font-mono">[ NO DATA RECORDED ]</div>
                            ) : (
                                contents.map((item) => (
                                    <div key={item.idContent} className="group bg-[#181818] border border-[#2a2a2a] p-6 hover:border-[#e60000] transition-all duration-300 relative shadow-inner">
                                        <div className="absolute top-0 left-0 w-[2px] h-full bg-[#e60000] scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>

                                        {editingId === item.idContent ? (
                                            <div className="space-y-4">
                                                <input className="w-full bg-[#111] border border-[#333] p-3 text-white font-mono outline-none focus:border-[#e60000]" value={editForm.head} onChange={(e) => setEditForm({...editForm, head: e.target.value})} />
                                                <select className="w-full bg-[#111] border border-[#333] p-3 text-white font-mono outline-none" value={editForm.kategori} onChange={(e) => setEditForm({...editForm, kategori: e.target.value})}>
                                                    <option value="General">General</option>
                                                    <option value="Lore">Lore</option>
                                                    <option value="Fan-Novel">Fan-Novel</option>
                                                    <option value="Speculation">Speculation</option>
                                                    <option value="Analistic Pshycologic">Analytic Psychological</option>
                                                </select>
                                                <textarea className="w-full h-32 bg-[#111] border border-[#333] p-3 text-white font-mono outline-none" value={editForm.paragrafs} onChange={(e) => setEditForm({...editForm, paragrafs: e.target.value})} />
                                                <div className="flex gap-3">
                                                    <button onClick={() => handleUpdate(item.idContent)} className="bg-[#e60000] px-6 py-2 font-bold text-xs uppercase">Confirm</button>
                                                    <button onClick={() => setEditingId(null)} className="bg-[#333] px-6 py-2 font-bold text-xs uppercase">Abort</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <span className="text-[10px] text-[#e60000] font-bold font-mono">
                                                            ENTRY ID: {item.idContent?.substring(0, 8)}
                                                        </span>
                                                        {/* TAMPILAN TANGGAL BIAR LU BISA CEK URUTANNYA */}
                                                        <span className="text-[9px] text-[#444] font-mono font-bold uppercase">
                                                            FILE DATE: {formatDate(item.createdAt)}
                                                        </span>
                                                        <span className={`text-[9px] font-black px-3 py-0.5 border uppercase tracking-widest ${getBadgeStyle(item.kategori)}`}>
                                                            {item.kategori}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-black uppercase text-white group-hover:text-[#e60000] transition-colors mb-2">{item.head}</h3>
                                                    <p className="text-[#bbb] text-sm line-clamp-2 font-sans opacity-90 leading-relaxed max-w-3xl">
                                                        {item.paragrafs.replace(/<[^>]*>/g, '').substring(0, 180)}...
                                                    </p>
                                                </div>
                                                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                                                    <button onClick={() => startEdit(item)} className="flex-1 md:w-28 border border-[#333] hover:border-white text-white px-5 py-2 text-[10px] font-bold uppercase transition-all">Edit File</button>
                                                    <button onClick={() => handleDelete(item.idContent)} className="flex-1 md:w-28 border border-[#333] hover:bg-[#e60000] hover:border-[#e60000] text-white px-5 py-2 text-[10px] font-bold uppercase transition-all">Delete</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}