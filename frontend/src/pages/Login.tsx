import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { oauthLoginUrl } from '../lib/api';
import type { CurrentUser } from '../types/forum';

export default function Login({ user }: { user: CurrentUser | null; setUser: (user: CurrentUser | null) => void }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#050505] p-5">
            <div className="relative w-full max-w-lg border border-[#333] bg-[#0a0a0a] p-10">
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#e60000]" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#e60000]" />

                <div className="mb-8 border-l-4 border-[#e60000] pl-4">
                    <h1 className="font-mono text-3xl font-black uppercase tracking-normal text-white">System Login</h1>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#666]">Google Authorization Gateway</p>
                </div>

                <button
                    type="button"
                    onClick={() => { window.location.href = oauthLoginUrl(); }}
                    className="flex w-full items-center justify-center gap-3 bg-white px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black transition-all duration-300 hover:bg-[#ccc]"
                >
                    <LogIn size={18} />
                    Login via Google
                </button>
            </div>
        </div>
    );
}
