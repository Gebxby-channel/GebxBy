import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import api from '../lib/api';

export default function NotificationBell({ showLabel = false, onNavigate }: { showLabel?: boolean; onNavigate?: () => void }) {
    const unreadQuery = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async ({ signal }) => (await api.get<{ count: number }>('/api/notifications/unread-count', { signal })).data.count ?? 0,
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
    const unreadCount = unreadQuery.data ?? 0;

    return (
        <NavLink
            to="/notifications"
            onClick={onNavigate}
            aria-label="Notifikasi"
            className={({ isActive }) => `relative flex min-h-10 items-center gap-3 rounded-full px-3 text-[#d6d6d9] transition-colors hover:bg-white/10 hover:text-white ${isActive ? 'text-white' : ''}`}
        >
            <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#181818]">
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff1744] px-1 font-mono text-[9px] font-black text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </span>
            {showLabel && <span>Notifikasi</span>}
        </NavLink>
    );
}
