import { decodeTrie, editDistance } from 'cspell-trie-lib';
import nspell from 'nspell';
import idTrieRaw from '../../node_modules/@cspell/dict-id-id/dict/id-id.trie?raw';
import englishAff from '../../node_modules/dictionary-en/index.aff?raw';
import englishDic from '../../node_modules/dictionary-en/index.dic?raw';

const indonesianTrie = decodeTrie(idTrieRaw);
const englishSpell = nspell(englishAff, englishDic);
const WORD_PATTERN = /[\p{L}]+(?:['\u2018\u2019-][\p{L}]+)*/gu;
const SPELLING_CACHE_LIMIT = 6000;
const spellingCache = new Map<string, boolean>();

const DOMAIN_WORDS = new Set([
    'ashford',
    'biohazard',
    'capcom',
    'cloning',
    'cloningan',
    'codexavernico',
    'direktor',
    'direktornya',
    'dna',
    'edward',
    'evil',
    'game',
    'gamenya',
    'lore',
    'originalnya',
    'project',
    'remake',
    'remakenya',
    'requiem',
    'resident',
    'umbrella',
    'veronica',
    'village',
]);

const AUTOCORRECT_OVERRIDES = new Map<string, string>([
    ['autocorerect', 'autocorrect'],
    ['clonning', 'cloning'],
    ['clonningan', 'cloningan'],
    ['emngarah', 'mengarah'],
    ['indoensia', 'indonesia'],
    ['kecualki', 'kecuali'],
]);

const PARTICLE_SUFFIXES = ['nyalah', 'nyakah', 'nyapun', 'nya', 'lah', 'kah', 'pun', 'ku', 'mu'];
const DERIVATIONAL_SUFFIXES = ['kan', 'an', 'i'];

export type SpellToken = {
    word: string;
    index: number;
};

export function getSpellTokens(text: string): SpellToken[] {
    const tokens: SpellToken[] = [];
    WORD_PATTERN.lastIndex = 0;

    for (const match of text.matchAll(WORD_PATTERN)) {
        if (typeof match.index !== 'number') {
            continue;
        }
        tokens.push({ word: match[0], index: match.index });
    }

    return tokens;
}

export function isMisspelledWord(word: string) {
    return !isAcceptedWord(word);
}

export function getAutoCorrection(word: string) {
    const normalized = normalizeToken(word);
    if (!normalized || isAcceptedWord(normalized)) {
        return null;
    }

    const lower = normalized.toLowerCase();
    const override = AUTOCORRECT_OVERRIDES.get(lower);
    if (override) {
        return preserveCase(word, override);
    }

    const suggestion = chooseSuggestion(lower);
    return suggestion ? preserveCase(word, suggestion) : null;
}

function isAcceptedWord(word: string) {
    const normalized = normalizeToken(word);
    if (!normalized || normalized.length <= 1) {
        return true;
    }

    if (/\d/.test(normalized) || /^[A-Z]{2,6}$/.test(normalized)) {
        return true;
    }

    const lower = normalized.toLowerCase();
    const cached = spellingCache.get(lower);
    if (cached !== undefined) {
        return cached;
    }

    const accepted = hasDictionaryWord(lower) || hasAcceptedDerivedForm(lower);
    rememberSpelling(lower, accepted);
    return accepted;
}

function hasDictionaryWord(word: string) {
    return DOMAIN_WORDS.has(word) || indonesianTrie.hasWord(word, false) || englishSpell.correct(word);
}

function hasAcceptedDerivedForm(word: string) {
    const suffixStripped = stripIndonesianSuffixes(word);
    if (suffixStripped !== word && hasDictionaryWord(suffixStripped)) {
        return true;
    }

    const baseWithoutDerivation = stripDerivationalSuffix(stripIndonesianSuffixes(word));
    if (baseWithoutDerivation !== word && hasDictionaryWord(baseWithoutDerivation)) {
        return true;
    }

    const particleFree = stripIndonesianSuffixes(word);
    if (particleFree.startsWith('ke') && particleFree.endsWith('an') && particleFree.length > 5) {
        const base = particleFree.slice(2, -2);
        if (hasDictionaryWord(base)) {
            return true;
        }
    }

    return false;
}

function stripIndonesianSuffixes(word: string) {
    let stripped = word;
    let changed = true;

    while (changed) {
        changed = false;
        for (const suffix of PARTICLE_SUFFIXES) {
            if (stripped.length > suffix.length + 2 && stripped.endsWith(suffix)) {
                stripped = stripped.slice(0, -suffix.length);
                changed = true;
                break;
            }
        }
    }

    return stripped;
}

function stripDerivationalSuffix(word: string) {
    for (const suffix of DERIVATIONAL_SUFFIXES) {
        if (word.length > suffix.length + 3 && word.endsWith(suffix)) {
            return word.slice(0, -suffix.length);
        }
    }

    return word;
}

function chooseSuggestion(word: string) {
    const suggestions = [
        ...indonesianTrie.suggest(word, {
            changeLimit: 4,
            ignoreCase: true,
            numSuggestions: 4,
        }),
        ...englishSpell.suggest(word).slice(0, 4),
    ];

    let best: { word: string; distance: number } | null = null;
    for (const suggestion of suggestions) {
        const normalizedSuggestion = normalizeToken(suggestion).toLowerCase();
        if (!normalizedSuggestion || !hasDictionaryWord(normalizedSuggestion)) {
            continue;
        }

        const distance = editDistance(word, normalizedSuggestion);
        if (!best || distance < best.distance) {
            best = { word: normalizedSuggestion, distance };
        }
    }

    if (!best) {
        return null;
    }

    const maxDistance = word.length >= 8 ? 2 : 1;
    if (best.distance <= maxDistance && word[0] === best.word[0]) {
        return best.word;
    }

    return null;
}

function normalizeToken(word: string) {
    return word
        .normalize('NFC')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/^-+|-+$/g, '')
        .trim();
}

function preserveCase(source: string, replacement: string) {
    if (source === source.toUpperCase()) {
        return replacement.toUpperCase();
    }

    if (/^[A-Z]/.test(source)) {
        return `${replacement.slice(0, 1).toUpperCase()}${replacement.slice(1)}`;
    }

    return replacement;
}

function rememberSpelling(word: string, accepted: boolean) {
    if (spellingCache.size >= SPELLING_CACHE_LIMIT) {
        const oldest = spellingCache.keys().next().value;
        if (oldest) {
            spellingCache.delete(oldest);
        }
    }
    spellingCache.set(word, accepted);
}
