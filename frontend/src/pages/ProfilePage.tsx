import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import logo from '../assets/S.T.A.R.S._logo.webp';
import { DEFAULT_CATEGORIES, getCategoryColor } from '../utils/categoryColors';
import { stripHtml } from '../utils/sanitize';
import type { ContentItem, CurrentUser } from '../types/forum';
import AdminMessagePanel from '../components/AdminMessagePanel';

interface EditForm {
    head: string;
    paragrafs: string;
    kategori: string;
}

export default function ProfilePage({ user }: { user: CurrentUser }) {
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ head: '', paragrafs: '', kategori: 'General' });
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [designation, setDesignation] = useState(user.designation || 'RECONNAISSANCE OFFICER');

    const navigate = useNavigate();

    const fetchMyContents = useCallback(async () => {
        const res = await api.get<ContentItem[]>('/content/all-content');
        const allData = Array.isArray(res.data) ? res.data : [];
        const myData = allData
            .filter(item => item.user?.userID === user.userID)
            .sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
            });
        setContents(myData);
    }, [sortOrder, user.userID]);

    useEffect(() => {
        void fetchMyContents();
    }, [fetchMyContents]);

    const handleSaveDesignation = async () => {
        await api.put('/api/user/update', { designation });
    };

    const handleUpdate = async (id: string) => {
        await api.put(`/content/edit/${id}`, editForm);
        setEditingId(null);
        await fetchMyContents();
    };

    const startEdit = (item: ContentItem) => {
        setEditingId(item.idContent);
        setEditForm({ head: item.head, paragrafs: stripHtml(item.paragrafs), kategori: item.kategori || 'General' });
    };

    const handleDelete = async (idContent: string) => {
        if (!window.confirm('WARNING: Data removal is permanent. Proceed?')) return;
        await api.delete(`/content/${idContent}`);
        await fetchMyContents();
    };

    return (
        <div className="min-h-screen bg-[#111] p-6 font-mono text-[#eee] lg:p-10">
            <div className="mx-auto max-w-[1600px]">
                <div className="mb-10 border-b border-[#2a2a2a] pb-4">
                    <button type="button" onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#888] transition-all duration-300 hover:text-[#e60000]">
                        <span className="text-xs font-bold uppercase tracking-widest">{'<'} Back to Command Center</span>
                    </button>
                </div>

                <div className="flex flex-col items-start gap-10 lg:flex-row">
                    <div className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-[380px]">
                        <p className="mb-3 pl-2 text-[10px] uppercase tracking-[0.3em] text-[#444]">Personnel Side ID</p>
                        <div className="relative flex aspect-[1.58/1] w-full origin-top-left scale-95 overflow-hidden rounded-xl border border-[#2a2a2a] bg-white shadow-2xl">
                            <div className="flex w-[40%] flex-col items-center justify-center border-r-[3px] border-white bg-[#1a3a63] p-4">
                                <img src={logo} alt="S.T.A.R.S. Logo" className="w-[85%] object-contain" />
                                <h2 className="mt-3 text-center text-[5px] font-black uppercase leading-tight tracking-normal text-white">Special Tactics and Rescue Service</h2>
                            </div>
                            <div className="relative flex flex-1 flex-col bg-white p-4 text-[#1a3a63]">
                                <h1 className="text-3xl font-black leading-none tracking-normal">POLICE</h1>
                                <p className="text-[11px] font-bold">CENTRAL ARCHIVE DEP.</p>
                                <div className="mt-2 space-y-4">
                                    <Field label="Officer Name" value={user.name} />
                                    <div className="relative border-b border-[#1a3a63] pb-0.5">
                                        <input
                                            type="text"
                                            value={designation}
                                            onBlur={() => void handleSaveDesignation()}
                                            onChange={(event) => setDesignation(event.target.value.toUpperCase())}
                                            className="w-full bg-transparent text-xs font-black uppercase tracking-normal outline-none transition-colors focus:text-red-600"
                                        />
                                        <span className="absolute -bottom-3 right-0 text-[6px] font-bold uppercase opacity-60">Asignation</span>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-end justify-between">
                                    <div className="h-20 w-16 border border-[#1a3a63] bg-gray-100 p-0.5 shadow-md">
                                        <img src={user.picture} alt="Officer" className="h-full w-full object-cover grayscale contrast-125" referrerPolicy="no-referrer" />
                                    </div>
                                    <div className="ml-3 flex flex-1 flex-col items-end">
                                        <div className="w-full max-w-[100px] text-center">
                                            <div className="mb-0.5 truncate border-b border-[#1a3a63] pb-0.5 font-serif text-sm italic">GEBXBY</div>
                                            <span className="text-[7px] font-black uppercase">Authorized Signature</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {user.suspensionMarked && (
                            <div className="mt-4 border border-[#e60000] bg-[#1a0b0b] p-4">
                                <div className="mb-2 flex items-center gap-2 text-[#e60000]">
                                    <ShieldAlert size={16} />
                                    <span className="font-mono text-[10px] font-black uppercase tracking-widest">Suspension Mark Placeholder</span>
                                </div>
                                <div className="h-24 border border-dashed border-[#e60000]/40 bg-[#100]" />
                            </div>
                        )}
                    </div>

                    <div className="w-full flex-1">
                        {user.role === 'ADMIN' && <AdminMessagePanel />}

                        <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-[#2a2a2a] pb-6 md:flex-row md:items-center">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Personal Archives</h2>
                                <p className="font-mono text-xs text-[#888]">Managing {contents.length} secure data entries within this sector.</p>
                            </div>
                            <div className="flex w-full items-center gap-4 md:w-auto">
                                <select
                                    value={sortOrder}
                                    onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}
                                    className="cursor-pointer border border-[#333] bg-[#111] p-3 font-mono text-[10px] font-bold uppercase text-[#e60000] outline-none focus:border-[#e60000]"
                                >
                                    <option value="newest">Newest Entry</option>
                                    <option value="oldest">Oldest Entry</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => navigate('/write')}
                                    className="flex-1 bg-[#e60000] px-8 py-3 text-xs font-black uppercase tracking-normal text-white shadow-[4px_4px_0px_#444] transition-all duration-300 hover:bg-white hover:text-[#e60000] md:flex-none"
                                >
                                    + Create New Entry
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {contents.length === 0 ? (
                                <div className="border border-dashed border-[#2a2a2a] py-20 text-center font-mono text-[#444]">[ NO DATA RECORDED ]</div>
                            ) : (
                                contents.map(item => (
                                    <ArchiveItem
                                        key={item.idContent}
                                        item={item}
                                        editing={editingId === item.idContent}
                                        editForm={editForm}
                                        setEditForm={setEditForm}
                                        onEdit={() => startEdit(item)}
                                        onCancel={() => setEditingId(null)}
                                        onSave={() => void handleUpdate(item.idContent)}
                                        onDelete={() => void handleDelete(item.idContent)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value }: { label: string; value?: string }) {
    return (
        <div className="relative border-b border-[#1a3a63] pb-0.5">
            <span className="block truncate text-sm font-black uppercase">{value}</span>
            <span className="absolute -bottom-3 right-0 text-[6px] font-bold uppercase opacity-60">{label}</span>
        </div>
    );
}

function ArchiveItem({
    item,
    editing,
    editForm,
    setEditForm,
    onEdit,
    onCancel,
    onSave,
    onDelete,
}: {
    item: ContentItem;
    editing: boolean;
    editForm: EditForm;
    setEditForm: (form: EditForm) => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    const themeColor = getCategoryColor(item.kategori);
    return (
        <div className="bg-[#181818] p-6 shadow-inner transition-all duration-300" style={{ border: `1px solid #2a2a2a`, borderLeft: `3px solid ${themeColor}` }}>
            {editing ? (
                <div className="space-y-4">
                    <input className="w-full border border-[#333] bg-[#111] p-3 font-mono text-white outline-none focus:border-[#e60000]" value={editForm.head} onChange={(event) => setEditForm({ ...editForm, head: event.target.value })} />
                    <select className="w-full border border-[#333] bg-[#111] p-3 font-mono text-white outline-none" value={editForm.kategori} onChange={(event) => setEditForm({ ...editForm, kategori: event.target.value })}>
                        {DEFAULT_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <textarea className="h-40 w-full border border-[#333] bg-[#111] p-3 font-mono text-white outline-none" value={editForm.paragrafs} onChange={(event) => setEditForm({ ...editForm, paragrafs: event.target.value })} />
                    <div className="flex gap-3">
                        <button type="button" onClick={onSave} className="bg-[#e60000] px-6 py-2 text-xs font-bold uppercase">Confirm</button>
                        <button type="button" onClick={onCancel} className="bg-[#333] px-6 py-2 text-xs font-bold uppercase">Abort</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-4">
                            <span className="font-mono text-[10px] font-bold" style={{ color: themeColor }}>ENTRY ID: {item.idContent?.substring(0, 8)}</span>
                            <span className="font-mono text-[9px] font-bold uppercase text-[#444]">FILE DATE: {formatDate(item.createdAt)}</span>
                            <span className="border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: themeColor, borderColor: themeColor, backgroundColor: `${themeColor}15` }}>{item.kategori}</span>
                        </div>
                        <h3 className="mb-2 text-xl font-black uppercase text-white">{item.head}</h3>
                        <p className="line-clamp-2 max-w-3xl font-sans text-sm leading-relaxed text-[#bbb] opacity-90">{stripHtml(item.paragrafs).substring(0, 180)}...</p>
                    </div>
                    <div className="flex w-full flex-row gap-2 md:w-auto md:flex-col">
                        <button type="button" onClick={onEdit} className="flex-1 border border-[#333] px-5 py-2 text-[10px] font-bold uppercase text-white transition-all hover:border-white md:w-28">Edit File</button>
                        <button type="button" onClick={onDelete} className="flex-1 border border-[#333] px-5 py-2 text-[10px] font-bold uppercase text-white transition-all hover:border-[#e60000] hover:bg-[#e60000] md:w-28">Delete</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDate(dateString?: string) {
    if (!dateString) return 'NO DATA';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).toUpperCase();
}
