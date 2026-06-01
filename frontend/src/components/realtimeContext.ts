import { createContext } from 'react';

export type RealtimeContextValue = {
    subscribeContent: (contentId?: string) => () => void;
};

export const RealtimeContext = createContext<RealtimeContextValue>({
    subscribeContent: () => () => undefined,
});
