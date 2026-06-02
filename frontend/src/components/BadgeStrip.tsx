import { BadgeCheck, Clock3, Crown, Feather, KeyRound, Keyboard, Shield, ShieldX, Smile, Star } from 'lucide-react';
import type { Badge, BadgeCode } from '../types/forum';

const badgeStyle: Record<BadgeCode, string> = {
  ADMIN: 'border-[#f59e0b] text-[#f59e0b] bg-[#1f1403]',
  MODERATOR: 'border-[#facc15] text-[#facc15] bg-[#1c1704]',
  WRITERS: 'border-[#c084fc] text-[#c084fc] bg-[#16091f]',
  SURVIVOR: 'border-[#38bdf8] text-[#38bdf8] bg-[#06141d]',
  MEDIA_TEC: 'border-[#3b82f6] text-[#60a5fa] bg-[#071326]',
  LIGA: 'border-[#22c55e] text-[#4ade80] bg-[#061807]',
  CRIMINAL: 'border-[#e60000] text-[#ff5555] bg-[#1a0707]',
  SPEED: 'border-[#f97316] text-[#fb923c] bg-[#1a0d04]',
  SMILE: 'border-[#fef08a] text-[#fef08a] bg-[#171506]',
  REQUIEM: 'border-[#e5e7eb] text-[#f8fafc] bg-[#111827]',
};

const icons = {
  ADMIN: KeyRound,
  MODERATOR: Crown,
  WRITERS: Keyboard,
  SURVIVOR: Star,
  MEDIA_TEC: BadgeCheck,
  LIGA: Crown,
  CRIMINAL: ShieldX,
  SPEED: Clock3,
  SMILE: Smile,
  REQUIEM: Feather,
} satisfies Record<BadgeCode, typeof Shield>;

export default function BadgeStrip({ badges, compact = false }: { badges?: Badge[]; compact?: boolean }) {
  if (!badges?.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => {
        const code = badge.code as BadgeCode | undefined;
        const Icon = code ? icons[code] ?? Shield : Shield;
        const key = badge.id ?? badge.code ?? badge.label;
        const style = code ? badgeStyle[code] : 'border-[#f8fafc] text-[#f8fafc] bg-[#111827]';
        const badgeImage = badge.image?.trim();
        return (
          <span
            key={key}
            title={`${badge.label}: ${badge.description}`}
            className={`badge-aura inline-flex items-center gap-1 border px-2 py-1 font-mono font-black uppercase ${compact ? 'text-[8px]' : 'text-[9px]'} ${style}`}
          >
            {badgeImage ? (
              <img src={badgeImage} alt="" width={compact ? 12 : 14} height={compact ? 12 : 14} className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} object-contain`} />
            ) : badge.custom ? (
              <span className="text-[11px] leading-none">{badge.icon}</span>
            ) : (
              <Icon size={compact ? 10 : 12} />
            )}
            {compact ? badge.label.substring(0, 3) : badge.label}
          </span>
        );
      })}
    </div>
  );
}
