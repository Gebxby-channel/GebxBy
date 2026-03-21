import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/S.T.A.R.S._logo.webp';

export default function OtherProfilePage({ user }: { user: any }) {
    const { userId } = useParams();
    const [contents, setContents] = useState<any[]>([]);
    const [viewedUser, setViewedUser] = useState<any>(null);
    // const [ setLoading] = useState(true);

    const [designation, setDesignation] = useState(() => {
        return localStorage.getItem('user_designation') || "RECONNAISSANCE OFFICER";
    });

    const navigate = useNavigate();
    const API_BASE = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/content';

    // LOGIKA PERBAIKAN: Pastikan membandingkan tipe data yang sama (String)
    // Cek apakah field-nya 'userID' atau 'id' sesuai dengan objek user kamu
    const isMyOwnProfile = String(user?.userID || user?.id) === String(userId);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        fetchProfileData();
    }, [user, userId]);

    const fetchProfileData = async () => {
        // setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/all-content`, { withCredentials: true });
            const allData = Array.isArray(res.data) ? res.data : [];

            // FILTER: Mencocokkan konten dengan userId di URL
            const targetData = allData.filter(item => String(item.user?.userID) === String(userId));
            setContents(targetData);

            // LOGIKA IF: Set viewedUser jika data ditemukan
            if (targetData.length > 0) {
                console.log("Data ditemukan, mengatur viewedUser:", targetData[0].user);
                setViewedUser(targetData[0].user);
            } else {
                console.warn("Tidak ada konten ditemukan untuk ID ini.");
            }
        } catch (error) {
            console.error("Critical Failure: Data fetch aborted.", error);
        } finally {
            // setLoading(false);
        }
    };

    const getBadgeStyle = (cat: string) => {
        switch(cat) {
            case 'Lore': return 'border-[#e60000] text-[#e60000] bg-[#e60000]/10';
            case 'Analistic Pshycologic': return 'border-pink-600 text-pink-500 bg-pink-600/10';
            default: return 'border-[#444] text-[#888] bg-[#1a1a1a]';
        }
    };

    // Fallback Image jika foto user atau placeholder mati
    const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=1a3a63&color=fff&name=" + (viewedUser?.name || "User");

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#111] text-[#eee] font-mono p-6 lg:p-10">
            <div className="max-w-[1600px] mx-auto">
                <div className="mb-10 border-b border-[#2a2a2a] pb-4 flex justify-between items-center">
                    <button onClick={() => navigate('/')} className="group flex items-center gap-2 text-[#888] hover:text-[#e60000] transition-all">
                        <span className="font-bold tracking-widest text-xs uppercase">{"<"} Back to Command Center</span>
                    </button>
                    <div className="text-[10px] text-[#444] uppercase tracking-tighter">
                        Mode: <span className={isMyOwnProfile ? "text-green-500" : "text-yellow-500"}>
                            {isMyOwnProfile ? "ADMIN_ACCESS" : "GUEST_RESTRICTED"}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-10 items-start">
                    {/* KOLOM KIRI: S.T.A.R.S. ID CARD */}
                    <div className="w-full lg:w-[380px] flex-shrink-0 lg:sticky lg:top-28">
                        <div className="relative w-full aspect-[1.58/1] bg-white rounded-xl overflow-hidden flex shadow-2xl border border-[#2a2a2a] scale-95 origin-top-left">
                            <div className="w-[40%] bg-[#1a3a63] flex flex-col items-center justify-center p-4 border-r-[3px] border-white text-center">
                                <img src={logo} alt="STARS" className="w-[80%] mb-2" />
                                <h2 className="text-white text-[10px] font-black leading-tight uppercase">SPECIAL TACTICS AND RESCUE SERVICE</h2>
                            </div>

                            <div className="flex-1 bg-white p-4 flex flex-col relative text-[#1a3a63]">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <h1 className="text-3xl font-black leading-none">POLICE</h1>
                                        <p className="text-[10px] font-bold">RACCOON POLICE DEP.</p>
                                    </div>
                                    <div className="w-8 h-8 border border-[#1a3a63] flex items-center justify-center font-black text-xs italic">RPD</div>
                                </div>

                                <div className="space-y-4 mt-2">
                                    <div className="border-b border-[#1a3a63] pb-0.5 relative">
                                        <span className="text-sm font-black block uppercase truncate">
                                            {isMyOwnProfile ? user.name : (viewedUser?.name || "N/A")}
                                        </span>
                                        <span className="absolute -bottom-3 right-0 text-[6px] font-bold opacity-60 uppercase">Officer Name</span>
                                    </div>
                                    <div className="border-b border-[#1a3a63] pb-0.5 relative">
                                        <input
                                            type="text"
                                            value={isMyOwnProfile ? designation : "ACCESS_RESTRICTED"}
                                            disabled={!isMyOwnProfile}
                                            onChange={(e) => setDesignation(e.target.value.toUpperCase())}
                                            className="w-full bg-transparent text-[10px] font-black uppercase outline-none"
                                        />
                                        <span className="absolute -bottom-3 right-0 text-[6px] font-bold opacity-60 uppercase">Designation</span>
                                    </div>
                                </div>

                                <div className="flex mt-4 items-end justify-between">
                                    {/* FOTO USER DENGAN FALLBACK TERJAMIN */}
                                    <div className="w-16 h-20 border border-[#1a3a63] bg-gray-200 p-0.5">
                                        <img
                                            src={isMyOwnProfile ? user.picture : (viewedUser?.picture || DEFAULT_AVATAR)}
                                            alt="Photo"
                                            className="w-full h-full object-cover grayscale contrast-125"
                                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="flex-1 ml-3 flex flex-col items-end">
                                        <div className="text-center w-full max-w-[100px]">
                                            <div className="font-serif italic text-sm border-b border-[#1a3a63] pb-0.5 mb-0.5 leading-none truncate">
                                                {/*{user.name?.split(' ')[0]}*/}
                                                GEBXBY
                                            </div>
                                            <span className="text-[7px] font-black uppercase">Authorized Signature</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KOLOM KANAN: DATA ENTRIES */}
                    <div className="flex-1 w-full">
                        <div className="mb-10 border-b border-[#2a2a2a] pb-6">
                            <h2 className="text-2xl font-black uppercase tracking-widest">
                                {isMyOwnProfile ? "Personal Archives" : "Remote Sector Data"}
                            </h2>
                            <p className="text-[#888] text-xs font-mono">
                                Viewing {contents.length} remote entries for subject: {userId?.substring(0,8)}...
                            </p>
                        </div>

                        <div className="grid gap-6">
                            {contents.map((item) => (
                                <div key={item.idContent} onClick={() => navigate(`/read/${item.idContent}`)} className="group bg-[#181818] border border-[#2a2a2a] p-6 hover:border-[#e60000] cursor-pointer transition-all relative">
                                    <div className="absolute top-0 left-0 w-[2px] h-full bg-[#e60000] scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <span className="text-[10px] text-[#e60000] font-bold">ENTRY ID: {item.idContent?.substring(0, 8)}...</span>
                                                <span className={`text-[9px] font-black px-3 py-0.5 border uppercase tracking-widest ${getBadgeStyle(item.kategori)}`}>{item.kategori}</span>
                                            </div>
                                            <h3 className="text-xl font-black uppercase text-white group-hover:text-[#e60000] mb-2">{item.head}</h3>
                                            <p className="text-[#bbb] text-sm line-clamp-2 opacity-90">{item.paragrafs.substring(0, 180)}...</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}