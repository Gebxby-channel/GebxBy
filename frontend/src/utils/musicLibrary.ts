const musicModules = import.meta.glob('../assets/music/*.{mp3,wav,ogg,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface MusicTrack {
  id: string;
  title: string;
  url: string;
}

export const MUSIC_TRACKS: MusicTrack[] = Object.entries(musicModules).map(([path, url]) => {
  const fileName = path.split('/').pop() ?? path;
  return {
    id: fileName,
    title: fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
    url,
  };
});
