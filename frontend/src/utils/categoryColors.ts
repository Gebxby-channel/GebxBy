export const categoryColors: Record<string, string> = {
    'LORE':                    '#e60000',
    'SPECULATION':             '#3b82f6',
    'ANALISTIC PSHYCOLOGIC':   '#ec4899',
    'FAN-NOVEL':               '#eab308',
    'GENERAL':                 '#ffffff',
    'QNA':                     '#a855f7',
};

let runtimeCategoryColors: Record<string, string> = {};

export const setRuntimeCategoryColors = (genres: Array<{ name: string; color: string }>) => {
    runtimeCategoryColors = genres.reduce<Record<string, string>>((acc, genre) => {
        if (genre.name && /^#[0-9a-f]{6}$/i.test(genre.color)) {
            acc[genre.name.toUpperCase()] = genre.color;
        }
        return acc;
    }, {});
};

export const getCategoryColor = (kategori?: string): string => {
    const key = kategori?.toUpperCase() ?? '';
    return runtimeCategoryColors[key] ?? categoryColors[key] ?? '#ffffff';
};

export const DEFAULT_CATEGORIES = [
    'General',
    'Lore',
    'Speculation',
    'Analistic Pshycologic',
    'Fan-Novel',
    'QNA',
];
