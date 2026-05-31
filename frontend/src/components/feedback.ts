import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastItem = {
    id: string;
    message: string;
    tone: ToastTone;
};

export type ConfirmOptions = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
};

export type PromptOptions = {
    title: string;
    message?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    multiline?: boolean;
    maxLength?: number;
};

export type ConfirmState = ConfirmOptions & {
    resolve: (value: boolean) => void;
};

export type PromptState = PromptOptions & {
    value: string;
    resolve: (value: string | null) => void;
};

export type FeedbackContextValue = {
    toast: (message: string, tone?: ToastTone) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
};

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used inside FeedbackProvider');
    }
    return context;
}
