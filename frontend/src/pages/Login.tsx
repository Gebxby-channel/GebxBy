import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, LogIn, RefreshCw, UserRound } from 'lucide-react';
import api, { isRequestCanceled, oauthLoginUrl } from '../lib/api';
import type { CurrentUser } from '../types/forum';

type AuthMode = 'login' | 'signup';

type UsernameCheckResponse = {
    username: string;
    available: boolean;
    message: string;
};

type UsernameSuggestResponse = {
    suggestions: string[];
};

export default function Login({ user, setUser }: { user: CurrentUser | null; setUser: (user: CurrentUser | null) => void }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [usernameTouched, setUsernameTouched] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<UsernameCheckResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        if (mode !== 'signup' || usernameTouched || !signupName.trim()) return;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => {
            void api.get<UsernameSuggestResponse>('/api/usernames/suggest', {
                signal: controller.signal,
                params: { name: signupName, email: signupEmail },
            }).then((response) => {
                const suggestion = response.data.suggestions[0] || '';
                if (suggestion) {
                    setSignupUsername(suggestion);
                }
            }).catch((error) => {
                if (!isRequestCanceled(error)) {
                    setSignupUsername('');
                }
            });
        }, 280);
        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [mode, signupName, signupEmail, usernameTouched]);

    useEffect(() => {
        if (mode !== 'signup' || !signupUsername.trim()) {
            setUsernameStatus(null);
            return;
        }
        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            try {
                const response = await api.get<UsernameCheckResponse>('/api/usernames/check', {
                    signal: controller.signal,
                    params: { username: signupUsername },
                });
                setUsernameStatus(response.data);
            } catch (error) {
                if (!isRequestCanceled(error)) {
                    setUsernameStatus({ username: signupUsername, available: false, message: 'USERNAME_CHECK_FAILED' });
                }
            }
        }, 250);
        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [mode, signupUsername]);

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

    const handleSignup = async () => {
        if (!signupName.trim() || !signupEmail.trim() || !signupPassword.trim() || !signupUsername.trim()) return;
        if (usernameStatus && !usernameStatus.available) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.post<CurrentUser>('/api/auth/signup', {
                name: signupName,
                email: signupEmail,
                password: signupPassword,
                username: signupUsername,
            });
            setUser(response.data);
            navigate('/', { replace: true });
        } catch (requestError) {
            setError(getAuthError(requestError, 'SIGNUP_REJECTED'));
        } finally {
            setLoading(false);
        }
    };

    const suggestUsername = async (manual: boolean) => {
        if (manual) {
            setUsernameTouched(false);
        }
        const response = await api.get<UsernameSuggestResponse>('/api/usernames/suggest', {
            params: { name: signupName, email: signupEmail },
        });
        const suggestion = response.data.suggestions.find(item => item !== signupUsername) || response.data.suggestions[0] || '';
        if (suggestion) {
            setSignupUsername(suggestion);
            setUsernameTouched(false);
        }
    };

    const enterAsGuest = () => {
        setUser(null);
        navigate('/', { replace: true });
    };

    const usernameOk = Boolean(signupUsername.trim() && usernameStatus?.available);
    const signupDisabled = loading || !signupName.trim() || !signupEmail.trim() || signupPassword.length < 8 || !usernameOk;

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#050505] p-5">
            <div className="relative w-full max-w-2xl border border-[#333] bg-[#0a0a0a] p-6 sm:p-10">
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#e60000]" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#e60000]" />

                <div className="mb-8 border-l-4 border-[#e60000] pl-4">
                    <h1 className="font-mono text-3xl font-black uppercase tracking-normal text-white">System Access</h1>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#666]">Authorization Gateway</p>
                </div>

                <div className="mb-5 grid grid-cols-2 border border-[#2a2a2a]">
                    <ModeButton active={mode === 'login'} label="Login" onClick={() => { setMode('login'); setError(''); }} />
                    <ModeButton active={mode === 'signup'} label="Sign Up" onClick={() => { setMode('signup'); setError(''); }} />
                </div>

                {mode === 'login' ? (
                    <div className="mb-5 space-y-3">
                        <input
                            id="login-email"
                            name="email"
                            aria-label="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                            placeholder="Email"
                            type="email"
                            autoComplete="email"
                        />
                        <input
                            id="login-password"
                            name="password"
                            aria-label="Password"
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
                        <AuthError error={error} />
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
                ) : (
                    <div className="mb-5 space-y-3">
                        <input
                            id="signup-display-name"
                            name="displayName"
                            aria-label="Display name"
                            value={signupName}
                            onChange={(event) => setSignupName(event.target.value)}
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                            placeholder="Display name"
                            autoComplete="name"
                        />
                        <input
                            id="signup-email"
                            name="signupEmail"
                            aria-label="Signup email"
                            value={signupEmail}
                            onChange={(event) => setSignupEmail(event.target.value)}
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                            placeholder="Email"
                            type="email"
                            autoComplete="email"
                        />
                        <input
                            id="signup-password"
                            name="signupPassword"
                            aria-label="Signup password"
                            value={signupPassword}
                            onChange={(event) => setSignupPassword(event.target.value)}
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                            placeholder="Password, minimum 8 characters"
                            type="password"
                            autoComplete="new-password"
                        />
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <label className="relative block">
                                <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" size={15} />
                                <input
                                    id="signup-username"
                                    name="username"
                                    aria-label="Unique username"
                                    value={signupUsername}
                                    onChange={(event) => {
                                        setUsernameTouched(true);
                                        setSignupUsername(event.target.value.replace(/^@/, ''));
                                    }}
                                    className="w-full border border-[#333] bg-[#101010] py-3 pl-9 pr-4 font-mono text-xs text-white outline-none focus:border-[#e60000]"
                                    placeholder="unique_username"
                                    autoComplete="off"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void suggestUsername(true)}
                                disabled={loading || (!signupName.trim() && !signupEmail.trim())}
                                className="flex items-center justify-center gap-2 border border-[#333] px-4 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-[#777] hover:border-white hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <RefreshCw size={13} />
                                Random
                            </button>
                        </div>
                        <p className={`m-0 border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest ${
                            usernameOk
                                ? 'border-[#166534] bg-[#071407] text-[#4ade80]'
                                : signupUsername.trim()
                                    ? 'border-[#7f1d1d] bg-[#1a0707] text-[#ff5555]'
                                    : 'border-[#333] bg-[#111] text-[#555]'
                        }`}>
                            {usernameOk ? `@${usernameStatus?.username} available` : usernameStatus?.message || 'Username akan disarankan otomatis dari nama.'}
                        </p>
                        <AuthError error={error} />
                        <button
                            type="button"
                            onClick={() => void handleSignup()}
                            disabled={signupDisabled}
                            className="flex w-full items-center justify-center gap-3 border border-[#e60000] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#e60000] transition-all duration-300 hover:bg-[#e60000] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
                        >
                            <UserRound size={18} />
                            {loading ? 'Creating' : 'Create Account'}
                        </button>
                    </div>
                )}

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

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-11 font-mono text-[10px] font-black uppercase tracking-widest ${
                active ? 'bg-[#e60000] text-white' : 'text-[#777] hover:text-white'
            }`}
        >
            {label}
        </button>
    );
}

function AuthError({ error }: { error: string }) {
    if (!error) return null;
    return (
        <p className="m-0 border border-[#e60000]/40 bg-[#180707] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#e60000]">
            {error}
        </p>
    );
}

function getAuthError(error: unknown, fallback: string) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: unknown } }).response;
        const data = response?.data;
        if (typeof data === 'string' && data.trim()) {
            return data;
        }
        if (typeof data === 'object' && data !== null && 'message' in data) {
            const message = (data as { message?: unknown }).message;
            if (typeof message === 'string' && message.trim()) {
                return message;
            }
        }
    }
    return fallback;
}
