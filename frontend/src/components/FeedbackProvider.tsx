import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { FeedbackContext } from './feedback';
import type { ConfirmOptions, ConfirmState, PromptOptions, PromptState, ToastItem, ToastTone } from './feedback';
import { Button, Modal } from './ui';

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
                        className={`flex items-start gap-3 border bg-[var(--app-panel)] p-3 font-mono text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-black/50 ${
                            item.tone === 'success'
                                ? 'border-[var(--app-success-border)] text-[var(--app-success-text)]'
                                : item.tone === 'error'
                                    ? 'border-[#7f1d1d] text-[#ff5555]'
                                    : 'border-[var(--app-border-soft)] text-[var(--app-text)]'
                        }`}
                    >
                        <span className="mt-0.5">
                            {item.tone === 'success' ? <CheckCircle2 size={15} /> : item.tone === 'error' ? <AlertTriangle size={15} /> : <Info size={15} />}
                        </span>
                        <span className="min-w-0 flex-1 leading-5">{item.message}</span>
                        <button
                            type="button"
                            onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}
                            className="text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
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
                            className="min-h-32 w-full resize-y border border-[var(--app-border-soft)] bg-[var(--app-input)] p-3 font-sans text-sm leading-6 text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
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
                            className="h-11 w-full border border-[var(--app-border-soft)] bg-[var(--app-input)] px-3 font-sans text-sm text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
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
        <Modal
            title={title}
            description={message}
            onClose={onCancel}
            size="sm"
            footer={(
                <>
                    <Button type="button" onClick={onCancel}>{cancelLabel}</Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                        variant={danger ? 'danger' : 'success'}
                    >
                        {confirmLabel}
                    </Button>
                </>
            )}
        >
            {children ? <div>{children}</div> : null}
        </Modal>
    );
}
