import { useContext, useEffect } from 'react';
import { RealtimeContext } from '../components/realtimeContext';

export function useRealtimeContentSubscription(contentId?: string) {
    const realtime = useContext(RealtimeContext);
    useEffect(() => realtime.subscribeContent(contentId), [contentId, realtime]);
}
