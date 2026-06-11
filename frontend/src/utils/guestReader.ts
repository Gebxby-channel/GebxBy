export const GUEST_READER_HEADER = 'X-Guest-Reader-Key';

const GUEST_READER_STORAGE_KEY = 'gebxby:guest-reader-key';
let memoryGuestReaderKey: string | null = null;

export function getGuestReaderKey() {
    if (memoryGuestReaderKey) {
        return memoryGuestReaderKey;
    }

    if (typeof localStorage === 'undefined') {
        memoryGuestReaderKey = createGuestReaderKey();
        return memoryGuestReaderKey;
    }

    try {
        const stored = localStorage.getItem(GUEST_READER_STORAGE_KEY);
        if (stored && isValidGuestReaderKey(stored)) {
            memoryGuestReaderKey = stored;
            return stored;
        }

        const created = createGuestReaderKey();
        localStorage.setItem(GUEST_READER_STORAGE_KEY, created);
        memoryGuestReaderKey = created;
        return created;
    } catch {
        memoryGuestReaderKey = createGuestReaderKey();
        return memoryGuestReaderKey;
    }
}

function createGuestReaderKey() {
    const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `guest-${random}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
}

function isValidGuestReaderKey(value: string) {
    return /^guest-[a-zA-Z0-9_-]{8,80}$/.test(value);
}
