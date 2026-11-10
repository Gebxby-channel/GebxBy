import { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign } from 'lucide-react';
import api from '../lib/api';
import type { SearchPayload } from '../types/forum';

interface MentionTextareaProps {
    id: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
    className: string;
    rows?: number;
}

export default function MentionTextarea({ id, name, value, onChange, placeholder, disabled = false, className, rows = 4 }: MentionTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [caret, setCaret] = useState(0);
    const [users, setUsers] = useState<SearchPayload['users']>([]);
    const [loading, setLoading] = useState(false);
    const beforeCaret = value.slice(0, caret);
    const mention = useMemo(() => /(?:^|\s)@([A-Za-z0-9._]*)$/.exec(beforeCaret), [beforeCaret]);
    const query = mention?.[1] ?? '';

    useEffect(() => {
        if (query.length < 2) {
            setUsers([]);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setLoading(true);
            api.get<SearchPayload>('/api/search', { signal: controller.signal, params: { q: query, type: 'users', size: 5 } })
                .then(response => setUsers(response.data.users ?? []))
                .catch(() => setUsers([]))
                .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 180);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [query]);

    const chooseUser = (username: string) => {
        const textarea = textareaRef.current;
        if (!textarea || !mention) return;
        const start = caret - mention[0].length + (mention[0].startsWith(' ') ? 1 : 0);
        const next = `${value.slice(0, start)}@${username} ${value.slice(caret)}`;
        const nextCaret = start + username.length + 2;
        onChange(next);
        setUsers([]);
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(nextCaret, nextCaret);
            setCaret(nextCaret);
        });
    };

    return (
        <div className="relative min-w-0">
            <textarea
                ref={textareaRef}
                id={id}
                name={name}
                aria-label={id}
                value={value}
                onChange={(event) => { onChange(event.target.value); setCaret(event.target.selectionStart); }}
                onKeyUp={(event) => setCaret(event.currentTarget.selectionStart)}
                onClick={(event) => setCaret(event.currentTarget.selectionStart)}
                placeholder={placeholder}
                disabled={disabled}
                rows={rows}
                className={className}
            />
            {(users.length > 0 || loading) && (
                <div className="absolute bottom-full left-0 z-40 mb-2 max-h-56 w-full overflow-y-auto rounded-xl border border-[#303030] bg-[#101010] p-1 shadow-2xl">
                    {loading && <p className="m-0 px-3 py-2 text-xs text-[#777]">Mencari pengguna…</p>}
                    {users.map((user) => (
                        <button key={user.userID} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => user.username && chooseUser(user.username)} className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#252525] text-[#999]">
                                {user.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" /> : <AtSign size={15} />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
                                <span className="block truncate text-xs text-[#777]">@{user.username}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
