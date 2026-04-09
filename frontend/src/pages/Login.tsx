import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login({ user, setUser }: { user: any, setUser: any }) {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Jika user sudah terdeteksi login, tendang balik ke Home
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Opsi 1: Handle Login/Daftar Manual
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('https://federal-wasp-gebxby-18a594b4.koyeb.app/api/user/create', {
                name: name,
                email: email
            });

            // Simpan data user ke LocalStorage agar frontend tahu dia sudah "masuk"
            const userData = response.data;
            localStorage.setItem('manualUser', JSON.stringify(userData));
            setUser(userData);
            navigate('/');
        } catch (err) {
            setError('[ ERROR: Gagal mengakses database ]');
        } finally {
            setLoading(false);
        }
    };

    // Opsi 2: Handle Login via Google
    const handleGoogleLogin = () => {
        window.location.href = 'https://federal-wasp-gebxby-18a594b4.koyeb.app/oauth2/authorization/google';
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
            <div className="border border-[#333] p-10 max-w-lg w-full relative bg-[#0a0a0a]">
                {/* Aksen sudut ala Terminal / Sci-Fi */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#e60000]"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#e60000]"></div>

                <div className="mb-8 border-l-4 border-[#e60000] pl-4">
                    <h1 className="text-white text-3xl font-mono font-black uppercase tracking-[0.2em]">System Login</h1>
                    <p className="text-[#666] text-xs font-mono uppercase tracking-widest mt-1">
                        Select Authorization Method
                    </p>
                </div>

                {error && <p className="text-[#e60000] text-xs font-mono mb-4">{error}</p>}

                {/* AREA LOGIN MANUAL */}
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 mb-8">
                    <div>
                        <label className="text-[#555] text-[10px] font-mono tracking-[0.2em] uppercase">Username_</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] text-white p-2 font-mono mt-1 focus:border-[#e60000] focus:outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[#555] text-[10px] font-mono tracking-[0.2em] uppercase">Email_Address_</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#111] border border-[#333] text-white p-2 font-mono mt-1 focus:border-[#e60000] focus:outline-none transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-transparent border border-[#555] text-white hover:border-[#e60000] hover:text-[#e60000] transition-all duration-300 px-4 py-2 mt-2 font-bold font-mono uppercase tracking-widest text-sm"
                    >
                        {loading ? 'Processing...' : 'Manual Access'}
                    </button>
                </form>

                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="h-[1px] w-full bg-[#333]"></div>
                    <span className="text-[#555] text-[10px] font-mono uppercase tracking-widest">OR</span>
                    <div className="h-[1px] w-full bg-[#333]"></div>
                </div>

                {/* AREA LOGIN GOOGLE */}
                <div className="text-center">
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-[#ccc] transition-all duration-300 px-8 py-3 font-bold font-mono uppercase tracking-widest text-sm"
                    >
                        {/* Logo Google sederhana pakai SVG */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Login via Google
                    </button>
                </div>

            </div>
        </div>
    );
}