import { Music, Palette, ScrollText } from 'lucide-react';
import { MUSIC_TRACKS } from '../utils/musicLibrary';
import type { ThemeMode } from '../types/forum';

interface SettingsPageProps {
    theme: ThemeMode;
    musicEnabled: boolean;
    musicTrackId: string;
    onThemeChange: (theme: ThemeMode) => void;
    onMusicEnabledChange: (enabled: boolean) => void;
    onMusicTrackChange: (trackId: string) => void;
}

export default function SettingsPage({
    theme,
    musicEnabled,
    musicTrackId,
    onThemeChange,
    onMusicEnabledChange,
    onMusicTrackChange,
}: SettingsPageProps) {
    return (
        <div className="space-y-8">
            <header className="border-l-4 border-[#e60000] pl-6">
                <h1 className="font-mono text-3xl font-black uppercase tracking-widest text-white">Settings</h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-tight text-[#666]">Policy // theme protocol // music channel</p>
            </header>

            <section className="border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-4 flex items-center gap-3 border-b border-[#2a2a2a] pb-3">
                    <ScrollText size={18} className="text-[#e60000]" />
                    <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Policy</h2>
                </div>
                <div className="space-y-3 font-sans text-sm leading-7 text-[#aaa]">
                    <p className="m-0">Gunakan forum untuk diskusi tulisan, teori, QNA, dan arsip komunitas dengan tetap menghormati pengguna lain.</p>
                    <p className="m-0">Admin dan moderator dapat menghapus konten, komentar, memberi suspend sementara, dan mengirim pesan jika ada pelanggaran.</p>
                    <p className="m-0">Guest boleh membaca dan melihat kategori. Aksi menulis, vote, komentar, dan personalisasi memerlukan login.</p>
                </div>
            </section>

            <section className="border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-4 flex items-center gap-3 border-b border-[#2a2a2a] pb-3">
                    <Palette size={18} className="text-[#e60000]" />
                    <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Theme Color</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                    <ThemeButton active={theme === 'dark'} label="Black Default" onClick={() => onThemeChange('dark')} />
                    <ThemeButton active={theme === 'light'} label="White" onClick={() => onThemeChange('light')} />
                </div>
            </section>

            <section className="border border-[#2a2a2a] bg-[#151515] p-5">
                <div className="mb-4 flex items-center gap-3 border-b border-[#2a2a2a] pb-3">
                    <Music size={18} className="text-[#e60000]" />
                    <h2 className="m-0 font-mono text-sm font-black uppercase tracking-widest text-white">Music</h2>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <label className="flex h-11 cursor-pointer items-center gap-3 border border-[#333] px-4 font-mono text-[10px] font-black uppercase tracking-widest text-[#aaa]">
                        <input
                            type="checkbox"
                            checked={musicEnabled}
                            onChange={(event) => onMusicEnabledChange(event.target.checked)}
                            className="h-4 w-4 accent-[#e60000]"
                        />
                        Music {musicEnabled ? 'On' : 'Off'}
                    </label>
                    <select
                        value={musicTrackId}
                        onChange={(event) => onMusicTrackChange(event.target.value)}
                        disabled={MUSIC_TRACKS.length === 0}
                        className="h-11 min-w-[260px] border border-[#333] bg-[#101010] px-3 font-mono text-xs text-white outline-none focus:border-[#e60000] disabled:opacity-45"
                    >
                        {MUSIC_TRACKS.length === 0 ? (
                            <option value="">No music files found</option>
                        ) : (
                            MUSIC_TRACKS.map(track => (
                                <option key={track.id} value={track.id}>{track.title}</option>
                            ))
                        )}
                    </select>
                </div>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-[#555]">
                    Default mati. Taruh file musik di frontend/src/assets/music lalu rebuild untuk muncul di daftar.
                </p>
            </section>
        </div>
    );
}

function ThemeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-11 border px-5 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                active
                    ? 'border-[#e60000] bg-[#e60000] text-white'
                    : 'border-[#333] text-[#777] hover:border-[#e60000] hover:text-white'
            }`}
        >
            {label}
        </button>
    );
}
