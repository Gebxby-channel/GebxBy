import type { LucideIcon } from 'lucide-react';
import { BarChart2, Database, History, LayoutGrid, PenTool, Settings, ShieldCheck, User } from 'lucide-react';
import type { CurrentUser } from '../types/forum';

export interface NavigationItem {
    label: string;
    path: string;
    icon: LucideIcon;
}

const publicMenuItems: NavigationItem[] = [
    { label: 'Beranda', path: '/', icon: Database },
    { label: 'Kategori', path: '/category', icon: LayoutGrid },
    { label: 'Pengaturan', path: '/settings', icon: Settings },
];

const memberMenuItems: NavigationItem[] = [
    { label: 'Riwayat', path: '/logs', icon: History },
    { label: 'Tulis', path: '/write', icon: PenTool },
    { label: 'Profil', path: '/profile', icon: User },
    { label: 'Analitik', path: '/analytics', icon: BarChart2 },
];

export function buildNavigationItems(user: CurrentUser | null): NavigationItem[] {
    return [
        ...publicMenuItems,
        ...(user ? memberMenuItems : []),
        ...(user?.role === 'ADMIN' ? [{ label: 'Admin', path: '/control-room', icon: ShieldCheck }] : []),
    ];
}
