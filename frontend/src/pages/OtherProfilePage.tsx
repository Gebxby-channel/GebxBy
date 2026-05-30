import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import logo from '../assets/S.T.A.R.S._logo.webp';
import { getCategoryColor } from '../utils/categoryColors';
import { stripHtml } from '../utils/sanitize';
import type { ContentItem, CurrentUser, PublicUser } from '../types/forum';

export default function OtherProfilePage({ user }: { user: CurrentUser | null }) {
    const { userId } = useParams();
    const [contents, setContents] = useState<ContentItem[]>([]);
    const [viewedUser, setViewedUser] = useState<PublicUser | null>(null);
    const navigate = useNavigate();
    const isMyOwnProfile = String(user?.userID) === String(userId);

    const fetchProfileData = useCallback(async (targetUserId: string) => {
        const [profileRes, contentRes] = await Promise.all([
            api.get<PublicUser>(`/api/user/${targetUserId}`),
            api.get<ContentItem[]>('/content/all-content'),
        ]);
        setViewedUser(profileRes.data);
        setContents((Array.isArray(contentRes.data) ? contentRes.data : []).filter(item => item.user?.userID === targetUserId));
    }, []);

    useEffect(() => {
        if (!userId) return;
        void fetchProfileData(userId);
    }, [fetchProfileData, userId]);

    const displayUser = isMyOwnProfile && user ? user : viewedUser;
    const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(displayUser?.name || 'User')}`;

    return (
        <div className="min-h-screen bg-[#111] p-6 font-mono text-[#eee] lg:p-10">
            <div className="mx-auto max-w-[1600px]">
                <div className="mb-10 flex items-center justify-between border-b border-[#2a2a2a] pb-4">
                    <button type="button" onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#888] transition-all hover:text-[#e60000]">
                        <span className="text-xs font-bold uppercase tracking-widest">{'<'} Back to Command Center</span>
                    </button>
                    <div className="text-[10px] uppercase tracking-normal text-[#444]">
                        Mode: <span className={isMyOwnProfile ? 'text-green-500' : 'text-yellow-500'}>
                            {isMyOwnProfile ? 'SELF_ACCESS' : 'GUEST_RESTRICTED'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-start gap-10 lg:flex-row">
                    <div className="w-full flex-shrink-0 lg:sticky lg:top-28 lg:w-[380px]">
                        <div className="relative flex aspect-[1.58/1] w-full origin-top-left scale-95 overflow-hidden rounded-xl border border-[#2a2a2a] bg-white shadow-2xl">
                            <div className="flex w-[40%] flex-col items-center justify-center border-r-[3px] border-white bg-[#1a3a63] p-4 text-center">
                                <img src={logo} alt="STARS" className="mb-2 w-[80%]" />
                                <h2 className="text-[10px] font-black uppercase leading-tight text-white">SPECIAL TACTICS AND RESCUE SERVICE</h2>
                            </div>

                            <div className="relative flex flex-1 flex-col bg-white p-4 text-[#1a3a63]">
                                <div className="mb-2 flex items-start justify-between">
                                    <div className="flex flex-col">
                                        <h1 className="text-3xl font-black leading-none">POLICE</h1>
                                        <p className="text-[10px] font-bold">CENTRAL ARCHIVE DEP.</p>
                                    </div>
                                    <div className="flex h-8 w-8 items-center justify-center border border-[#1a3a63] text-xs font-black italic">RPD</div>
                                </div>

                                <div className="mt-2 space-y-4">
                                    <ProfileField label="Officer Name" value={displayUser?.name || 'N/A'} />
                                    <ProfileField label="Designation" value={displayUser?.designation || 'ACCESS_RESTRICTED'} />
                                </div>

                                <div className="mt-4 flex items-end justify-between">
                                    <div className="h-20 w-16 border border-[#1a3a63] bg-gray-200 p-0.5">
                                        <img
                                            src={displayUser?.picture || defaultAvatar}
                                            alt="Photo"
                                            className="h-full w-full object-cover grayscale contrast-125"
                                            onError={(event) => { event.currentTarget.src = defaultAvatar; }}
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="ml-3 flex flex-1 flex-col items-end">
                                        <div className="w-full max-w-[100px] text-center">
                                            <div className="mb-0.5 truncate border-b border-[#1a3a63] pb-0.5 font-serif text-sm italic leading-none">GEBXBY</div>
                                            <span className="text-[7px] font-black uppercase">Authorized Signature</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {displayUser?.suspensionMarked && (
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
                        <div className="mb-10 border-b border-[#2a2a2a] pb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest">{isMyOwnProfile ? 'Personal Archives' : 'Remote Sector Data'}</h2>
                            <p className="font-mono text-xs text-[#888]">Viewing {contents.length} remote entries for subject: {userId?.substring(0, 8)}...</p>
                        </div>

                        <div className="grid gap-6">
                            {contents.map(item => {
                                const color = getCategoryColor(item.kategori);
                                return (
                                    <div key={item.idContent} onClick={() => navigate(`/read/${item.idContent}`)} className="group cursor-pointer border border-[#2a2a2a] bg-[#181818] p-6 transition-all hover:border-[#e60000]">
                                        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                                            <div className="flex-1">
                                                <div className="mb-2 flex flex-wrap items-center gap-4">
                                                    <span className="text-[10px] font-bold text-[#e60000]">ENTRY ID: {item.idContent?.substring(0, 8)}...</span>
                                                    <span className="border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ borderColor: color, color, backgroundColor: `${color}15` }}>{item.kategori}</span>
                                                </div>
                                                <h3 className="mb-2 text-xl font-black uppercase text-white group-hover:text-[#e60000]">{item.head}</h3>
                                                <p className="line-clamp-2 text-sm text-[#bbb] opacity-90">{stripHtml(item.paragrafs).substring(0, 180)}...</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ label, value }: { label: string; value: string }) {
    return (
        <div className="relative border-b border-[#1a3a63] pb-0.5">
            <span className="block truncate text-sm font-black uppercase">{value}</span>
            <span className="absolute -bottom-3 right-0 text-[6px] font-bold uppercase opacity-60">{label}</span>
        </div>
    );
}
