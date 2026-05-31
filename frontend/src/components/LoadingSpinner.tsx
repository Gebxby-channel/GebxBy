export default function LoadingSpinner({
    label = 'Loading',
    fullScreen = false,
    compact = false,
}: {
    label?: string;
    fullScreen?: boolean;
    compact?: boolean;
}) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? 'min-h-screen bg-[#050505]' : compact ? 'py-8' : 'py-24'}`}>
            <div className={`${compact ? 'h-7 w-7' : 'h-11 w-11'} animate-spin rounded-full border-2 border-[#242424] border-t-[#e60000]`} />
            {label && (
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#555]">
                    {label}
                </span>
            )}
        </div>
    );
}
