import type { LucideIcon } from 'lucide-react';
import { BarChart2, Database, History, PenTool, Settings, ShieldCheck, User } from 'lucide-react';
import type { CurrentUser } from '../types/forum';

export interface NavigationItem {
    label: string;
    path: string;
    icon: LucideIcon;
}

const publicMenuItems: NavigationItem[] = [
    { label: 'Database', path: '/', icon: Database },
    { label: 'Setting', path: '/settings', icon: Settings },
];

const memberMenuItems: NavigationItem[] = [
    { label: 'Log', path: '/logs', icon: History },
    { label: 'Write', path: '/write', icon: PenTool },
    { label: 'Biodata', path: '/profile', icon: User },
    { label: 'Analisis', path: '/analytics', icon: BarChart2 },
];

export function buildNavigationItems(user: CurrentUser | null): NavigationItem[] {
    return [
        ...publicMenuItems,
        ...(user ? memberMenuItems : []),
        ...(user?.role === 'ADMIN' ? [{ label: 'Command', path: '/control-room', icon: ShieldCheck }] : []),
    ];
}
