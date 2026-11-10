import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AtSign, LogIn, RefreshCw, UserRound } from 'lucide-react';
import api, { isRequestCanceled, oauthLoginUrl } from '../lib/api';
import type { CurrentUser } from '../types/forum';

type AuthMode = 'login' | 'signup' | 'onboarding';

type UsernameCheckResponse = {
    username: string;
    available: boolean;
    message: string;
};

type UsernameSuggestResponse = {
    suggestions: string[];
};

type AuthChallengeResponse = {
    verificationRequired: boolean;
    emailHint: string | null;
    user: CurrentUser | null;
};

export default function Login({ user, setUser }: { user: CurrentUser | null; setUser: (user: CurrentUser | null) => void }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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
    const [verificationRequired, setVerificationRequired] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [emailHint, setEmailHint] = useState('');
    const setupMode = mode === 'signup' || mode === 'onboarding';

    useEffect(() => {
        if (user?.onboardingComplete === false) {
            setMode('onboarding');
            setSignupName(current => current || user.name || '');
            setSignupEmail(user.email || '');
            setSignupUsername(current => current || user.username || '');
            return;
        }
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        if (searchParams.get('mode') === 'signup') {
            setMode('signup');
        }
        if (searchParams.get('verify') === '1') {
            setVerificationRequired(true);
        }
        if (searchParams.get('verification') === 'unavailable') {
            setError('Kode Google gagal dikirim. Periksa konfigurasi SMTP server atau coba lagi nanti.');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!setupMode || usernameTouched || !signupName.trim() || mode === 'onboarding') return;
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
    }, [mode, setupMode, signupName, signupEmail, usernameTouched]);

    useEffect(() => {
        if (!setupMode || !signupUsername.trim()) {
            setUsernameStatus(null);
            return;
        }
        if (mode === 'onboarding' && signupUsername.trim().toLowerCase() === (user?.username || '').toLowerCase()) {
            setUsernameStatus({ username: signupUsername.trim(), available: true, message: 'CURRENT_USERNAME_READY' });
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
    }, [mode, setupMode, signupUsername, user?.username]);

    const handleEmailLogin = async () => {
        if (!email.trim() || !password.trim()) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.post<AuthChallengeResponse>('/api/auth/email-login', { email, password });
            if (response.data.verificationRequired) {
                setEmailHint(response.data.emailHint || 'email terdaftar');
                setVerificationRequired(true);
            } else if (response.data.user) {
                setUser(response.data.user);
                navigate('/', { replace: true });
            } else {
                setError('Login berhasil tetapi data sesi tidak lengkap. Silakan coba lagi.');
            }
        } catch (requestError) {
            setError(getAuthError(requestError, 'EMAIL_OR_PASSWORD_REJECTED'));
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
            const response = await api.post<AuthChallengeResponse>('/api/auth/signup', {
                name: signupName,
                email: signupEmail,
                password: signupPassword,
                username: signupUsername,
            });
            if (response.data.verificationRequired) {
                setEmailHint(response.data.emailHint || 'email terdaftar');
                setVerificationRequired(true);
            } else if (response.data.user) {
                setUser(response.data.user);
                navigate('/', { replace: true });
            } else {
                setError('Akun berhasil dibuat tetapi data sesi tidak lengkap. Silakan coba login.');
            }
        } catch (requestError) {
            setError(getAuthError(requestError, 'SIGNUP_REJECTED'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!/^\d{6}$/.test(verificationCode)) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.post<CurrentUser>('/api/auth/verify-code', { code: verificationCode });
            setUser(response.data);
            navigate('/', { replace: true });
        } catch (requestError) {
            setError(getAuthError(requestError, 'Kode verifikasi tidak valid atau sudah kedaluwarsa.'));
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/resend-code');
            setError('Kode baru sudah dikirim.');
        } catch (requestError) {
            setError(getAuthError(requestError, 'Kode gagal dikirim ulang.'));
        } finally {
            setLoading(false);
        }
    };

    const handleOnboarding = async () => {
        if (!user || !signupName.trim() || !signupUsername.trim()) return;
        if (usernameStatus && !usernameStatus.available) return;
        setLoading(true);
        setError('');
        try {
            const response = await api.put<CurrentUser>('/api/user/update', {
                name: signupName,
                username: signupUsername,
                designation: user.designation || 'RECONNAISSANCE OFFICER',
            });
            setUser(response.data);
            navigate('/', { replace: true });
        } catch (requestError) {
            setError(getAuthError(requestError, 'SETUP_REJECTED'));
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
    const onboardingDisabled = loading || !signupName.trim() || !usernameOk;

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#050505] p-5">
            <div className="relative w-full max-w-2xl border border-[#333] bg-[#0a0a0a] p-6 sm:p-10">
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#ff1744]" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#ff1744]" />

                <div className="mb-8 border-l-4 border-[#ff1744] pl-4">
                    <h1 className="font-mono text-3xl font-black uppercase tracking-normal text-white">System Access</h1>
                    <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[#666]">Authorization Gateway</p>
                </div>

                {!verificationRequired && mode !== 'onboarding' ? (
                    <div className="mb-5 grid grid-cols-2 border border-[#2a2a2a]">
                        <ModeButton active={mode === 'login'} label="Login" onClick={() => { setMode('login'); setError(''); }} />
                        <ModeButton active={mode === 'signup'} label="Sign Up" onClick={() => { setMode('signup'); setError(''); }} />
                    </div>
                ) : (
                    <div className="mb-5 border border-[#2a2a2a] bg-[#111] p-4 font-mono text-[10px] font-black uppercase tracking-widest text-[#888]">
                        Complete account verification before entering the archive.
                    </div>
                )}

                {verificationRequired ? (
                    <div className="mb-5 space-y-3">
                        <p className="m-0 border border-[#2a2a2a] bg-[#111] p-4 font-mono text-xs leading-6 text-[#aaa]">
                            Kode verifikasi 6 digit telah dikirim ke {emailHint || 'email kamu'}. Kode berlaku selama 10 menit.
                        </p>
                        <input
                            id="verification-code"
                            name="verificationCode"
                            aria-label="Kode verifikasi"
                            value={verificationCode}
                            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={(event) => { if (event.key === 'Enter') void handleVerifyCode(); }}
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.5em] text-white outline-none focus:border-[#ff1744]"
                            placeholder="000000"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            autoFocus
                        />
                        <AuthError error={error} />
                        <button type="button" onClick={() => void handleVerifyCode()} disabled={loading || verificationCode.length !== 6} className="flex w-full items-center justify-center gap-3 border border-[#ff1744] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#ff1744] transition-all hover:bg-[#ff1744] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]">
                            {loading ? 'Checking' : 'Verifikasi kode'}
                        </button>
                        <button type="button" onClick={() => void handleResendCode()} disabled={loading} className="w-full py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#888] hover:text-white disabled:opacity-50">
                            Kirim ulang kode
                        </button>
                    </div>
                ) : mode === 'login' ? (
                    <div className="mb-5 space-y-3">
                        <input
                            id="login-email"
                            name="email"
                            aria-label="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#ff1744]"
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
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#ff1744]"
                            placeholder="Password"
                            type="password"
                            autoComplete="current-password"
                        />
                        <AuthError error={error} />
                        <button
                            type="button"
                            onClick={() => void handleEmailLogin()}
                            disabled={loading || !email.trim() || !password.trim()}
                            className="flex w-full items-center justify-center gap-3 border border-[#ff1744] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#ff1744] transition-all duration-300 hover:bg-[#ff1744] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
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
                            className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#ff1744]"
                            placeholder="Display name"
                            autoComplete="name"
                        />
                        {mode === 'signup' && (
                            <>
                                <input
                                    id="signup-email"
                                    name="signupEmail"
                                    aria-label="Signup email"
                                    value={signupEmail}
                                    onChange={(event) => setSignupEmail(event.target.value)}
                                    className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#ff1744]"
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
                                    className="w-full border border-[#333] bg-[#101010] px-4 py-3 font-mono text-xs text-white outline-none focus:border-[#ff1744]"
                                    placeholder="Password, minimum 8 characters"
                                    type="password"
                                    autoComplete="new-password"
                                />
                            </>
                        )}
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
                                    className="w-full border border-[#333] bg-[#101010] py-3 pl-9 pr-4 font-mono text-xs text-white outline-none focus:border-[#ff1744]"
                                    placeholder="nama pengguna"
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
                            {usernameOk ? `@${usernameStatus?.username} tersedia` : (usernameStatus?.message || 'Nama pengguna akan disarankan otomatis.').replaceAll('_', ' ')}
                        </p>
                        <AuthError error={error} />
                        <button
                            type="button"
                            onClick={() => void (mode === 'onboarding' ? handleOnboarding() : handleSignup())}
                            disabled={mode === 'onboarding' ? onboardingDisabled : signupDisabled}
                            className="flex w-full items-center justify-center gap-3 border border-[#ff1744] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#ff1744] transition-all duration-300 hover:bg-[#ff1744] hover:text-white disabled:cursor-not-allowed disabled:border-[#333] disabled:text-[#555]"
                        >
                            <UserRound size={18} />
                            {loading ? (mode === 'onboarding' ? 'Saving' : 'Creating') : (mode === 'onboarding' ? 'Save Identity' : 'Create Account')}
                        </button>
                    </div>
                )}

                {!verificationRequired && mode !== 'onboarding' && (
                    <button
                        type="button"
                        onClick={() => { window.location.href = oauthLoginUrl(); }}
                        className="flex w-full items-center justify-center gap-3 bg-white px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-black transition-all duration-300 hover:bg-[#ccc]"
                    >
                        <LogIn size={18} />
                        Login via Google
                    </button>
                )}

                {!verificationRequired && mode !== 'onboarding' && (
                    <button
                        type="button"
                        onClick={enterAsGuest}
                        className="mt-3 flex w-full items-center justify-center border border-[#333] px-8 py-3 font-mono text-sm font-bold uppercase tracking-widest text-[#777] transition-all duration-300 hover:border-white hover:text-white"
                    >
                        Continue as Guest
                    </button>
                )}
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
                active ? 'bg-[#ff1744] text-white' : 'text-[#777] hover:text-white'
            }`}
        >
            {label}
        </button>
    );
}

function AuthError({ error }: { error: string }) {
    if (!error) return null;
    return (
        <p className="m-0 border border-[#ff1744]/40 bg-[#180707] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-[#ff1744]">
            {error.replaceAll('_', ' ')}
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
