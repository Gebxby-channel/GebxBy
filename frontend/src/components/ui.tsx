import { useEffect, useId } from 'react';
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
    primary: 'border-[var(--app-accent)] bg-[var(--app-accent)] text-white hover:bg-[var(--app-text)] hover:text-[var(--app-accent)]',
    danger: 'border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-white',
    success: 'border-[var(--app-success-border)] text-[var(--app-success-text)] hover:bg-[var(--app-success-border)] hover:text-white',
    ghost: 'border-[var(--app-border-soft)] text-[var(--app-text-muted)] hover:border-[var(--app-text)] hover:text-[var(--app-text)]',
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
    <section className={`border border-[var(--app-border)] bg-[var(--app-surface-2)] p-5 text-[var(--app-text)] ${className}`}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            {title && <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-[var(--app-text)]">{title}</h2>}
            {subtitle && <p className="m-0 mt-1 font-mono text-[10px] uppercase text-[var(--app-text-dim)]">{subtitle}</p>}
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
  description,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  className?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const sizes = {
    sm: 'max-w-lg',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[var(--app-overlay)] p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-[var(--app-text)] shadow-2xl shadow-black/60 ${sizes[size]} ${className}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-l-4 border-[var(--app-accent)] pl-4">
          <div>
            <h2 id={titleId} className="m-0 font-mono text-2xl font-black uppercase tracking-normal text-[var(--app-text)]">{title}</h2>
            {description && (
              <p id={descriptionId} className="m-0 mt-2 font-sans text-sm leading-6 text-[var(--app-text-soft)]">
                {description}
              </p>
            )}
          </div>
          <Button onClick={onClose} className="h-8 min-h-8 px-3" aria-label={`Close ${title}`}>Close</Button>
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
      className={`h-10 border border-[var(--app-border-soft)] bg-[var(--app-input)] px-3 font-mono text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] ${props.className ?? ''}`}
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
      className={`h-10 border border-[var(--app-border-soft)] bg-[var(--app-input)] px-3 font-mono text-xs uppercase text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] ${props.className ?? ''}`}
    />
  );
}

export function UserChip({ user, onClick }: { user?: PublicUser; onClick?: () => void }) {
  const defaultAvatar = `https://ui-avatars.com/api/?background=1a3a63&color=fff&name=${encodeURIComponent(user?.name || 'User')}`;
  const content = (
    <>
      <span className="h-8 w-8 overflow-hidden border border-[var(--app-border-soft)] bg-[var(--app-surface)]">
        {user?.picture ? (
          <img src={user.picture} alt="" width={32} height={32} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.src = defaultAvatar; }} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[var(--app-text-muted)]"><UserRound size={14} /></span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] font-black uppercase text-[var(--app-text)]">{user?.name || 'Unknown'}</span>
        <span className="block truncate font-mono text-[8px] uppercase text-[var(--app-text-dim)]">{user?.username ? `@${user.username}` : user?.designation || 'Archive Officer'}</span>
      </span>
    </>
  );
  if (!onClick) {
    return <span className="inline-flex max-w-full items-center gap-2">{content}</span>;
  }
  return (
    <button type="button" onClick={onClick} className="inline-flex max-w-full items-center gap-2 text-left hover:text-[var(--app-accent)]">
      {content}
    </button>
  );
}

export function StatChip({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className="border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <p className="m-0 font-mono text-[9px] font-black uppercase tracking-[0.25em] text-[var(--app-text-dim)]">{label}</p>
      <p className={`m-0 mt-2 font-mono text-2xl font-black ${danger ? 'text-[var(--app-accent)]' : 'text-[var(--app-text)]'}`}>{value}</p>
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
