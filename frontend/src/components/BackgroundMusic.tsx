import { useEffect, useRef } from 'react';
import { MUSIC_TRACKS } from '../utils/musicLibrary';

export default function BackgroundMusic({ enabled, trackId }: { enabled: boolean; trackId: string }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const track = MUSIC_TRACKS.find(item => item.id === trackId) ?? MUSIC_TRACKS[0];

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (!enabled || !track) {
            audio.pause();
            return;
        }
        audio.volume = 0.35;
        audio.src = track.url;
        audio.loop = true;
        void audio.play().catch(() => {
            audio.pause();
        });
    }, [enabled, track]);

    return <audio ref={audioRef} preload="none" />;
}
