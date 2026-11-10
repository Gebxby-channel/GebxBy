import { useNavigate } from 'react-router-dom';

const MENTION_PATTERN = /(^|[^A-Za-z0-9._])@([A-Za-z0-9._]{3,24})(?![A-Za-z0-9._])/g;

export default function MentionText({ text }: { text: string }) {
    const navigate = useNavigate();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_PATTERN.lastIndex = 0;
    while ((match = MENTION_PATTERN.exec(text)) !== null) {
        const start = match.index + match[1].length;
        parts.push(text.slice(lastIndex, start));
        const username = match[2];
        parts.push(
            <button
                key={`${start}-${username}`}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/u/${encodeURIComponent(username)}`);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className="inline cursor-pointer border-0 bg-transparent p-0 font-semibold text-sky-400 hover:text-sky-300 hover:underline"
            >
                @{username}
            </button>,
        );
        lastIndex = MENTION_PATTERN.lastIndex;
    }
    parts.push(text.slice(lastIndex));
    return <>{parts}</>;
}
