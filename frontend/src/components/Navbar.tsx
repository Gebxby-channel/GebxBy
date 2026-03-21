import { useNavigate, Link } from 'react-router-dom';
// import logo from '../assets/logo.png'; // Menonaktifkan logo sesuai input, hanya visual

interface NavbarProps {
    user: any;
}

export default function Navbar({ user }: NavbarProps) {
    const navigate = useNavigate();

    return (
        <header className="flex justify-between items-center p-4 px-8 bg-[#111] border-b border-[#2a2a2a] sticky top-0 z-50 shadow-md">
            {/* Bagian Kiri: Logo dan Nama Brand (Canggih & Industrial) */}
            <Link to="/" className="flex items-center gap-3 no-underline group">
                <div className="border-l-2 border-[#e60000] pl-3"> {/* Aksen Garis Merah Umbrella */}
                    <h1 className="text-white text-2xl font-extrabold m-0 tracking-wider uppercase font-mono">
                        CodeXAvernico
                    </h1>
                    <p className="text-[#888] text-[10px] m-0 leading-tight font-mono uppercase tracking-widest">
                        Central Access
                    </p>
                </div>
            </Link>

            {/* Bagian Kanan: Auth / Profile (Minimalis Terintegrasi) */}
            {/* Bagian Rerata Navbar.tsx - Bagian Kanan: Auth / Profile */}
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-4">
                        <div
                            className="flex items-center gap-3 bg-[#181818] p-1.5 pr-4 rounded-full border border-[#2a2a2a] hover:border-[#e60000]/50 transition-colors cursor-pointer group"
                            onClick={() => navigate('/profile')}
                        >
                            <img
                                src={user.picture}
                                alt="Profile"
                                className="w-8 h-8 rounded-full border border-[#444] group-hover:border-[#e60000]"
                                referrerPolicy="no-referrer"
                            />
                            <p className="text-white text-xs font-bold font-mono tracking-tight m-0">{user.name?.split(' ')[0] || "Officer"}</p>
                        </div>

                        {/* TOMBOL LOGOUT BARU */}
                        <button
                            onClick={() => window.location.href = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/logout'}
                            className="border border-[#e60000]/30 text-[#e60000] px-3 py-1.5 text-[10px] font-mono font-bold uppercase hover:bg-[#e60000] hover:text-white transition-all"
                        >
                            Terminate
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => window.location.href = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/oauth2/authorization/google'}
                        className="bg-transparent border-2 border-[#e60000] text-[#e60000] py-2 px-6 rounded-sm font-bold cursor-pointer hover:bg-[#e60000] hover:text-white transition-all uppercase text-xs tracking-widest font-mono"
                    >
                        Initiate Access
                    </button>
                )}
            </div>
        </header>
    );
}