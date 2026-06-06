import { useEffect, useMemo } from 'react';
import { Copy, Link2, Mail, MessageCircle, MessageSquare, Send, Share2, X } from 'lucide-react';
import { useFeedback } from './feedback';

type ShareDialogProps = {
    open: boolean;
    title: string;
    url: string;
    text?: string;
    mediaUrl?: string;
    onClose: () => void;
};

type ShareTarget = {
    id: string;
    label: string;
    icon: 'native' | 'copy' | 'whatsapp' | 'telegram' | 'sms' | 'email' | 'facebook' | 'x' | 'reddit' | 'pinterest' | 'linkedin';
    color: string;
    href?: string;
    native?: boolean;
    copy?: boolean;
};

export default function ShareDialog({ open, title, url, text = '', mediaUrl, onClose }: ShareDialogProps) {
    const feedback = useFeedback();
    const shareText = text.trim() ? text.trim() : title;
    const canUseNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const targets = useMemo(() => buildShareTargets({ title, text: shareText, url, mediaUrl, canUseNativeShare }), [canUseNativeShare, mediaUrl, shareText, title, url]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, open]);

    if (!open) {
        return null;
    }

    const copyLink = async () => {
        await copyText(url);
        feedback.toast('Link berhasil disalin.', 'success');
    };

    const shareNative = async () => {
        if (!canUseNativeShare) {
            await copyLink();
            return;
        }
        try {
            await navigator.share({ title, text: shareText, url });
            onClose();
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
            feedback.toast('Share system tidak tersedia. Link disalin sebagai fallback.', 'info');
            await copyLink();
        }
    };

    const openTarget = async (target: ShareTarget) => {
        if (target.native) {
            await shareNative();
            return;
        }
        if (target.copy) {
            await copyLink();
            return;
        }
        if (!target.href) return;
        if (target.href.startsWith('mailto:') || target.href.startsWith('sms:')) {
            window.location.assign(target.href);
            return;
        }
        window.open(target.href, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section className="w-full max-w-2xl overflow-hidden border border-[#333] bg-[#1f1f1f] shadow-2xl shadow-black/60">
                <header className="flex items-start justify-between gap-4 border-b border-[#3a3a3a] px-6 py-5">
                    <div className="min-w-0">
                        <p className="m-0 font-mono text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">Transmission Link</p>
                        <h2 id="share-dialog-title" className="m-0 mt-1 truncate font-mono text-2xl font-black uppercase text-white">Share Entry</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-[#444] text-[#aaa] transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white"
                        aria-label="Close share dialog"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6">
                    <div className="mb-5">
                        <p className="m-0 line-clamp-2 font-mono text-lg font-black uppercase leading-snug text-white">{title}</p>
                        <p className="m-0 mt-2 line-clamp-2 font-sans text-sm leading-6 text-[#aaa]">{shareText}</p>
                    </div>

                    <div className="-mx-1 mb-6 flex gap-3 overflow-x-auto px-1 pb-2">
                        {targets.map((target) => (
                            <button
                                key={target.id}
                                type="button"
                                onClick={() => void openTarget(target)}
                                className="group flex w-20 flex-shrink-0 flex-col items-center gap-2 text-center"
                            >
                                <span
                                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 font-mono text-xl font-black text-white transition-all group-hover:-translate-y-1 group-hover:border-white group-hover:shadow-lg"
                                    style={{ backgroundColor: target.color }}
                                >
                                    <ShareIcon target={target.icon} />
                                </span>
                                <span className="line-clamp-1 font-mono text-[9px] font-black uppercase tracking-widest text-[#bbb] group-hover:text-white">{target.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex min-h-14 items-center gap-3 border border-[#444] bg-[#101010] px-4 py-2">
                        <Link2 size={17} className="flex-shrink-0 text-[#e60000]" />
                        <input
                            id="share-link-url"
                            name="shareLinkUrl"
                            aria-label="Share link"
                            value={url}
                            readOnly
                            className="min-w-0 flex-1 bg-transparent font-mono text-sm font-black text-white outline-none"
                            onFocus={(event) => event.currentTarget.select()}
                        />
                        <button
                            type="button"
                            onClick={() => void copyLink()}
                            className="h-10 border border-[#e60000] px-4 font-mono text-[10px] font-black uppercase text-[#e60000] transition-all hover:bg-[#e60000] hover:text-white"
                        >
                            Copy
                        </button>
                    </div>

                    <p className="m-0 mt-4 font-mono text-[9px] uppercase tracking-[0.25em] text-[#666]">
                        Native share akan membuka pilihan aplikasi di device. Tombol lain memakai link share resmi platform.
                    </p>
                </div>
            </section>
        </div>
    );
}

function buildShareTargets({
    title,
    text,
    url,
    mediaUrl,
    canUseNativeShare,
}: {
    title: string;
    text: string;
    url: string;
    mediaUrl?: string;
    canUseNativeShare: boolean;
}): ShareTarget[] {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(`${text} ${url}`.trim());
    const encodedDescription = encodeURIComponent(text);
    const encodedMedia = encodeURIComponent(mediaUrl || '');
    return [
        { id: 'native', label: canUseNativeShare ? 'System' : 'Copy', icon: canUseNativeShare ? 'native' : 'copy', color: '#4b5563', native: canUseNativeShare, copy: !canUseNativeShare },
        { id: 'copy', label: 'Copy Link', icon: 'copy', color: '#111827', copy: true },
        { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25d366', href: `https://wa.me/?text=${encodedText}` },
        { id: 'telegram', label: 'Telegram', icon: 'telegram', color: '#229ed9', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedDescription}` },
        { id: 'sms', label: 'Messages', icon: 'sms', color: '#16a34a', href: `sms:?&body=${encodedText}` },
        { id: 'facebook', label: 'Facebook', icon: 'facebook', color: '#4267b2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
        { id: 'x', label: 'X', icon: 'x', color: '#000000', href: `https://twitter.com/intent/tweet?text=${encodedDescription}&url=${encodedUrl}` },
        { id: 'email', label: 'Email', icon: 'email', color: '#737373', href: `mailto:?subject=${encodedTitle}&body=${encodedText}` },
        { id: 'reddit', label: 'Reddit', icon: 'reddit', color: '#ff4500', href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
        { id: 'pinterest', label: 'Pinterest', icon: 'pinterest', color: '#bd081c', href: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDescription}${mediaUrl ? `&media=${encodedMedia}` : ''}` },
        { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0a66c2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    ];
}

function ShareIcon({ target }: { target: ShareTarget['icon'] }) {
    if (target === 'native') return <Share2 size={21} />;
    if (target === 'copy') return <Copy size={21} />;
    if (target === 'whatsapp') return <MessageCircle size={23} />;
    if (target === 'telegram') return <Send size={21} />;
    if (target === 'sms') return <MessageSquare size={22} />;
    if (target === 'email') return <Mail size={22} />;
    if (target === 'facebook') return <span className="text-3xl leading-none">f</span>;
    if (target === 'x') return <span className="text-2xl leading-none">X</span>;
    if (target === 'reddit') return <span className="text-xl leading-none">R</span>;
    if (target === 'pinterest') return <span className="text-2xl leading-none">P</span>;
    return <span className="text-lg leading-none">in</span>;
}

async function copyText(value: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}
