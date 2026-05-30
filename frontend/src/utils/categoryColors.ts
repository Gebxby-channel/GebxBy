export const categoryColors: Record<string, string> = {
    'LORE':                    '#e60000',
    'SPECULATION':             '#3b82f6',
    'ANALISTIC PSHYCOLOGIC':   '#ec4899',
    'FAN-NOVEL':               '#eab308',
    'GENERAL':                 '#ffffff',
    'QNA':                     '#a855f7',
};

export const getCategoryColor = (kategori?: string): string => {
    return categoryColors[kategori?.toUpperCase() ?? ''] ?? '#ffffff';
};

export const DEFAULT_CATEGORIES = [
    'General',
    'Lore',
    'Speculation',
    'Analistic Pshycologic',
    'Fan-Novel',
    'QNA',
];
