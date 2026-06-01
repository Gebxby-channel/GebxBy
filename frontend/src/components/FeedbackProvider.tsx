import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { FeedbackContext } from './feedback';
import type { ConfirmOptions, ConfirmState, PromptOptions, PromptState, ToastItem, ToastTone } from './feedback';

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [promptState, setPromptState] = useState<PromptState | null>(null);

    const toast = useCallback((message: string, tone: ToastTone = 'info') => {
        const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts((current) => [...current, { id, message, tone }].slice(-4));
        window.setTimeout(() => {
            setToasts((current) => current.filter((item) => item.id !== id));
        }, tone === 'error' ? 5200 : 3600);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => (
        new Promise<boolean>((resolve) => {
            setConfirmState({ ...options, resolve });
        })
    ), []);

    const prompt = useCallback((options: PromptOptions) => (
        new Promise<string | null>((resolve) => {
            setPromptState({ ...options, value: '', resolve });
        })
    ), []);

    const value = useMemo(() => ({ toast, confirm, prompt }), [confirm, prompt, toast]);

    const settleConfirm = (accepted: boolean) => {
        confirmState?.resolve(accepted);
        setConfirmState(null);
    };

    const settlePrompt = (accepted: boolean) => {
        const value = promptState?.value.trim() ?? '';
        promptState?.resolve(accepted && value ? value : null);
        setPromptState(null);
    };

    return (
        <FeedbackContext.Provider value={value}>
            {children}

            <div className="fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
                {toasts.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-start gap-3 border bg-[#101010] p-3 font-mono text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-black/50 ${
                            item.tone === 'success'
                                ? 'border-[#166534] text-[#4ade80]'
                                : item.tone === 'error'
                                    ? 'border-[#7f1d1d] text-[#ff5555]'
                                    : 'border-[#333] text-[#ddd]'
                        }`}
                    >
                        <span className="mt-0.5">
                            {item.tone === 'success' ? <CheckCircle2 size={15} /> : item.tone === 'error' ? <AlertTriangle size={15} /> : <Info size={15} />}
                        </span>
                        <span className="min-w-0 flex-1 leading-5">{item.message}</span>
                        <button
                            type="button"
                            onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}
                            className="text-[#777] hover:text-white"
                            aria-label="Close notification"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {confirmState && (
                <FeedbackModal
                    title={confirmState.title}
                    message={confirmState.message}
                    confirmLabel={confirmState.confirmLabel ?? 'Confirm'}
                    cancelLabel={confirmState.cancelLabel ?? 'Cancel'}
                    danger={confirmState.danger}
                    onCancel={() => settleConfirm(false)}
                    onConfirm={() => settleConfirm(true)}
                />
            )}

            {promptState && (
                <FeedbackModal
                    title={promptState.title}
                    message={promptState.message}
                    confirmLabel={promptState.confirmLabel ?? 'Submit'}
                    cancelLabel={promptState.cancelLabel ?? 'Cancel'}
                    confirmDisabled={!promptState.value.trim()}
                    onCancel={() => settlePrompt(false)}
                    onConfirm={() => settlePrompt(true)}
                >
                    {promptState.multiline ? (
                        <textarea
                            id="feedback-prompt-textarea"
                            name="feedbackPrompt"
                            aria-label="Feedback prompt"
                            autoFocus
                            value={promptState.value}
                            maxLength={promptState.maxLength}
                            onChange={(event) => setPromptState((current) => current ? { ...current, value: event.target.value } : current)}
                            className="min-h-32 w-full resize-y border border-[#333] bg-[#090909] p-3 font-sans text-sm leading-6 text-white outline-none focus:border-[#e60000]"
                            placeholder={promptState.placeholder}
                        />
                    ) : (
                        <input
                            id="feedback-prompt-input"
                            name="feedbackPrompt"
                            aria-label="Feedback prompt"
                            autoFocus
                            value={promptState.value}
                            maxLength={promptState.maxLength}
                            onChange={(event) => setPromptState((current) => current ? { ...current, value: event.target.value } : current)}
                            className="h-11 w-full border border-[#333] bg-[#090909] px-3 font-sans text-sm text-white outline-none focus:border-[#e60000]"
                            placeholder={promptState.placeholder}
                        />
                    )}
                </FeedbackModal>
            )}
        </FeedbackContext.Provider>
    );
}

function FeedbackModal({
    title,
    message,
    confirmLabel,
    cancelLabel,
    danger = false,
    confirmDisabled = false,
    children,
    onCancel,
    onConfirm,
}: {
    title: string;
    message?: string;
    confirmLabel: string;
    cancelLabel: string;
    danger?: boolean;
    confirmDisabled?: boolean;
    children?: ReactNode;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-lg border border-[#333] bg-[#111] p-5 font-mono shadow-2xl shadow-black/70">
                <div className="mb-5 border-b border-[#2a2a2a] pb-4">
                    <p className="m-0 text-[10px] font-black uppercase tracking-[0.35em] text-[#e60000]">System Dialog</p>
                    <h2 className="m-0 mt-2 text-xl font-black uppercase tracking-widest text-white">{title}</h2>
                    {message && <p className="m-0 mt-2 text-sm leading-6 text-[#aaa]">{message}</p>}
                </div>
                {children && <div className="mb-5">{children}</div>}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-10 border border-[#333] px-4 text-[10px] font-black uppercase tracking-widest text-[#888] hover:border-white hover:text-white"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                        className={`h-10 border px-4 text-[10px] font-black uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40 ${
                            danger
                                ? 'border-[#e60000] text-[#e60000] hover:bg-[#e60000] hover:text-white'
                                : 'border-[#166534] text-[#4ade80] hover:bg-[#166534] hover:text-white'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
