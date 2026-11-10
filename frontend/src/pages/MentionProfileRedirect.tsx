import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { PublicUser } from '../types/forum';

export default function MentionProfileRedirect() {
    const { username = '' } = useParams();
    const navigate = useNavigate();
    const profile = useQuery({
        queryKey: ['mention-profile', username.toLowerCase()],
        queryFn: async ({ signal }) => (await api.get<PublicUser>(`/api/user/username/${encodeURIComponent(username)}`, { signal })).data,
        enabled: Boolean(username),
        staleTime: 5 * 60_000,
    });

    useEffect(() => {
        if (profile.data?.userID) navigate(`/profile/${profile.data.userID}`, { replace: true });
    }, [navigate, profile.data?.userID]);

    if (profile.isError) {
        return <div className="mx-auto max-w-xl rounded-2xl border border-[#292929] bg-[#111] p-8 text-center text-sm text-[#aaa]">Profil @{username} tidak ditemukan.</div>;
    }
    return <div className="mx-auto max-w-xl rounded-2xl border border-[#292929] bg-[#111] p-8 text-center text-sm text-[#777]">Membuka profil @{username}…</div>;
}
