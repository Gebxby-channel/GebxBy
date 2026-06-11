declare module 'nspell' {
    type DictionaryInput = {
        aff: string | Uint8Array;
        dic: string | Uint8Array;
    };

    type SpellChecker = {
        correct(word: string): boolean;
        suggest(word: string): string[];
        add(word: string, model?: string): void;
        remove(word: string): void;
    };

    export default function nspell(dictionary: DictionaryInput): SpellChecker;
    export default function nspell(aff: string | Uint8Array, dic: string | Uint8Array): SpellChecker;
}
