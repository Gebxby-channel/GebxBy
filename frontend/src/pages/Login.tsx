import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserRound } from 'lucide-react';
import api, { oauthLoginUrl } from '../lib/api';
import type { CurrentUser } from '../types/forum';

export default function Login({ user, setUser }: { user: CurrentUser | null; setUser: (user: CurrentUser | null) => void }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('Jill_Valentine74@admin.Code.X.Avernico.com');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const handleEmailLogin = async () => {
        if (!email.trim() || !password.trim()) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.post<CurrentUser>('/api/auth/email-login', { email, password });
            setUser(response.data);
            navigate('/', { replace: true });
        } catch {
            setError('EMAIL_OR_PASSWORD_REJECTED');
        } finally {
            setLoading(false);
        }
    };

    const enterAsGuest = () => {
        setUser(null);
        navigate('/', { replace: true });
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#050505] p-5">
            <div className="relative w-full max-w-lg border border-[#333] bg-[#0a0a0a] p-10">
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#e60000]" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#e60000]" />

                <div className="mb-8 border-l-4 border-[#e60000] pl-4">
                    <h1 className="font-mono text-3xl font-black uppercase tracking-normal text-white">System Login</h1>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#666]">Authorization Gateway</p>
                </div>

                <div className="mb-5 space-y-3">
                    <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                        placeholder="Email"
                        autoComplete="email"
                    />
                    <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                void handleEmailLogin();
                            }
                        }}
                        className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                        placeholder="Password"
                        type="password"
                        autoComplete="current-password"
                    />
                    {error && (
                        <p className="m-0 border border-[#e60000]/40 bg-[#180707] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#e60000]">
                            {error}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleEmailLogin()}
                        disabled={loading || !email.trim() || !password.trim()}
                        className="flex w-full items-center justify-center gap-3 border border-[#e60000] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#e60000] transition-all duration-300 hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
                    >
                        <UserRound size={18} />
                        {loading ? 'Checking' : 'Login via Email'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => { window.location.href = oauthLoginUrl(); }}
                    className="flex w-full items-center justify-center gap-3 bg-white px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black transition-all duration-300 hover:bg-[#ccc]"
                >
                    <LogIn size={18} />
                    Login via Google
                </button>

                <button
                    type="button"
                    onClick={enterAsGuest}
                    className="mt-3 flex w-full items-center justify-center border border-[#333] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#777] transition-all duration-300 hover:border-white hover:text-white"
                >
                    Continue as Guest
                </button>
            </div>
        </div>
    );
}
