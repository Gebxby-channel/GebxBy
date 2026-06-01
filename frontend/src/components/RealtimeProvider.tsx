import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/api';
import type { CommentItem, CurrentUser, NotificationItem } from '../types/forum';
import { RealtimeContext } from './realtimeContext';
import type { RealtimeContextValue } from './realtimeContext';

type RealtimeEnvelope = {
    type?: string;
    payload?: unknown;
};

type NotificationPayload = {
    notification?: NotificationItem;
    unreadCount?: number;
};

type CountPayload = {
    count?: number;
};

type CommentPayload = {
    contentId?: string;
    comment?: CommentItem;
    commentId?: string;
    commentCount?: number;
};

export function RealtimeProvider({ user, children }: { user: CurrentUser | null; children: ReactNode }) {
    const queryClient = useQueryClient();
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const reconnectAttemptRef = useRef(0);
    const closedIntentionallyRef = useRef(false);
    const connectRef = useRef<() => void>(() => undefined);
    const contentSubscriptionsRef = useRef(new Set<string>());

    const send = useCallback((message: unknown) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }
        socket.send(JSON.stringify(message));
    }, []);

    const resubscribeContent = useCallback(() => {
        contentSubscriptionsRef.current.forEach((contentId) => {
            send({ type: 'SUBSCRIBE_CONTENT', contentId });
        });
    }, [send]);

    const handleMessage = useCallback((event: MessageEvent<string>) => {
        const envelope = parseEnvelope(event.data);
        const type = envelope.type;
        if (!type) {
            return;
        }
        if (type === 'NOTIFICATION_CREATED') {
            const payload = envelope.payload as NotificationPayload;
            if (typeof payload.unreadCount === 'number') {
                queryClient.setQueryData(['notifications', 'unread-count'], payload.unreadCount);
            }
            if (payload.notification) {
                queryClient.setQueryData<NotificationItem[]>(['notifications', 'panel'], (current) => {
                    const existing = current ?? [];
                    const withoutDuplicate = existing.filter((item) => item.id !== payload.notification?.id);
                    return [payload.notification!, ...withoutDuplicate].slice(0, 30);
                });
            }
            return;
        }
        if (type === 'UNREAD_COUNT' || type === 'NOTIFICATIONS_READ') {
            const payload = envelope.payload as CountPayload;
            queryClient.setQueryData(['notifications', 'unread-count'], payload.count ?? 0);
            if (type === 'NOTIFICATIONS_READ') {
                queryClient.setQueryData<NotificationItem[]>(['notifications', 'panel'], (current) => current?.map((item) => ({ ...item, read: true })) ?? []);
            }
            return;
        }
        if (type === 'COMMENT_CREATED' || type === 'COMMENT_DELETED') {
            const payload = envelope.payload as CommentPayload;
            if (!payload.contentId) {
                return;
            }
            void queryClient.invalidateQueries({ queryKey: ['content-comments', payload.contentId] });
            void queryClient.invalidateQueries({ queryKey: ['content-stats', payload.contentId] });
            void queryClient.invalidateQueries({ queryKey: ['feed-page'] });
        }
    }, [queryClient]);

    const connect = useCallback(() => {
        if (!user) {
            return;
        }
        closedIntentionallyRef.current = false;
        const socket = new WebSocket(realtimeUrl());
        socketRef.current = socket;
        socket.onopen = () => {
            reconnectAttemptRef.current = 0;
            resubscribeContent();
            send({ type: 'PING' });
        };
        socket.onmessage = handleMessage;
        socket.onclose = () => {
            if (socketRef.current === socket) {
                socketRef.current = null;
            }
            if (!closedIntentionallyRef.current) {
                scheduleReconnect(() => connectRef.current(), reconnectAttemptRef, reconnectTimerRef);
            }
        };
        socket.onerror = () => {
            socket.close();
        };
    }, [handleMessage, resubscribeContent, send, user]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        if (!user) {
            closeSocket(socketRef, reconnectTimerRef, closedIntentionallyRef);
            return undefined;
        }
        connect();
        return () => closeSocket(socketRef, reconnectTimerRef, closedIntentionallyRef);
    }, [connect, user]);

    const value = useMemo<RealtimeContextValue>(() => ({
        subscribeContent: (contentId?: string) => {
            if (!contentId) {
                return () => undefined;
            }
            contentSubscriptionsRef.current.add(contentId);
            send({ type: 'SUBSCRIBE_CONTENT', contentId });
            return () => {
                contentSubscriptionsRef.current.delete(contentId);
                send({ type: 'UNSUBSCRIBE_CONTENT', contentId });
            };
        },
    }), [send]);

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

function realtimeUrl() {
    const base = API_BASE_URL.replace(/\/$/, '');
    if (base.startsWith('https://')) {
        return `wss://${base.slice('https://'.length)}/ws/realtime`;
    }
    if (base.startsWith('http://')) {
        return `ws://${base.slice('http://'.length)}/ws/realtime`;
    }
    return `${base}/ws/realtime`;
}

function parseEnvelope(value: string): RealtimeEnvelope {
    try {
        const parsed = JSON.parse(value) as RealtimeEnvelope;
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

function scheduleReconnect(
    connect: () => void,
    attemptRef: MutableRefObject<number>,
    reconnectTimerRef: MutableRefObject<number | null>,
) {
    if (reconnectTimerRef.current !== null) {
        return;
    }
    const attempt = Math.min(attemptRef.current + 1, 6);
    attemptRef.current = attempt;
    const delay = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
    reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
    }, delay);
}

function closeSocket(
    socketRef: MutableRefObject<WebSocket | null>,
    reconnectTimerRef: MutableRefObject<number | null>,
    closedIntentionallyRef: MutableRefObject<boolean>,
) {
    closedIntentionallyRef.current = true;
    if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
    }
    if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
    }
}
