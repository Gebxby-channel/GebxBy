import { useId } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { UserRound } from 'lucide-react';
import type { Badge, PublicUser } from '../types/forum';
import BadgeStrip from './BadgeStrip';

export function Button({
  children,
  variant = 'ghost',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'success' | 'ghost' }) {
  const variants = {
    primary: 'border-[#e60000] bg-[#e60000] text-white hover:bg-white hover:text-[#e60000]',
    danger: 'border-[#e60000] text-[#e60000] hover:bg-[#e60000] hover:text-white',
    success: 'border-[#166534] text-[#4ade80] hover:bg-[#166534] hover:text-white',
    ghost: 'border-[#333] text-[#777] hover:border-white hover:text-white',
  };
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center justify-center gap-2 border px-4 py-2 font-mono text-[10px] font-black uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  title,
  subtitle,
  action,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[#2a2a2a] bg-[#151515] p-5 ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-col gap-4 border-b border-[#2a2a2a] pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            {title && <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">{title}</h2>}
            {subtitle && <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[#666]">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl border border-[#2a2a2a] bg-[#0d0d0d] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4 border-l-4 border-[#e60000] pl-4">
          <h2 className="m-0 font-mono text-2xl font-black uppercase tracking-normal text-white">{title}</h2>
          <Button onClick={onClose} className="h-8 min-h-8 px-3">Close</Button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = props.id ?? props.name ?? `input-${autoId}`;
  const name = props.name ?? String(id);
  return (
    <input
      {...props}
      id={id}
      name={name}
      aria-label={props['aria-label'] ?? props.placeholder?.toString() ?? name}
      className={`h-10 border border-[#333] bg-[#101010] px-3 font-mono text-xs text-white outline-none focus:border-[#e60000] ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = props.id ?? props.name ?? `select-${autoId}`;
  const name = props.name ?? String(id);
  return (
    <select
      {...props}
      id={id}
      name={name}
      aria-label={props['aria-label'] ?? props.title ?? name}
      className={`h-10 border border-[#333] bg-[#101010] px-3 font-mono text-xs uppercase text-white outline-none focus:border-[#e60000] ${props.className ?? ''}`}
    />
  );
}

export function UserChip({ user, onClick }: { user?: PublicUser; onClick?: () => void }) {
  const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(user?.name || 'User')}`;
  const content = (
    <>
      <span className="h-8 w-8 overflow-hidden border border-[#333] bg-[#111]">
        {user?.picture ? (
          <img src={user.picture} alt="" width={32} height={32} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.src = defaultAvatar; }} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#777]"><UserRound size={14} /></span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] font-black uppercase text-white">{user?.name || 'Unknown'}</span>
        <span className="block truncate font-mono text-[8px] uppercase text-[#666]">{user?.username ? `@${user.username}` : user?.designation || 'Archive Officer'}</span>
      </span>
    </>
  );
  if (!onClick) {
    return <span className="inline-flex max-w-full items-center gap-2">{content}</span>;
  }
  return (
    <button type="button" onClick={onClick} className="inline-flex max-w-full items-center gap-2 text-left hover:text-[#e60000]">
      {content}
    </button>
  );
}

export function StatChip({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className="border border-[#2a2a2a] bg-[#111] p-4">
      <p className="m-0 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[#555]">{label}</p>
      <p className={`m-0 mt-2 font-mono text-2xl font-black ${danger ? 'text-[#e60000]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export function BadgeChip({ badge, onClick }: { badge: Badge; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className="disabled:cursor-default">
      <BadgeStrip badges={[badge]} />
    </button>
  );
}
