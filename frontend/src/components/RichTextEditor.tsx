import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
    Bold,
    Heading1,
    Heading2,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Quote,
    Redo2,
    Type,
    Underline as UnderlineIcon,
    Undo2,
} from 'lucide-react';
import { useFeedback } from './feedback';
import { getAutoCorrection, getSpellTokens, isMisspelledWord } from '../lib/writerSpellcheck';

const bilingualSpellcheckKey = new PluginKey<DecorationSet>('bilingualSpellcheck');
const BOUNDARY_PATTERN = /^[\s.,!?;:)\]}]+$/;

const BilingualSpellcheck = Extension.create({
    name: 'bilingualSpellcheck',

    addProseMirrorPlugins() {
        return [
            new Plugin<DecorationSet>({
                key: bilingualSpellcheckKey,
                state: {
                    init: (_, state) => buildSpellcheckDecorations(state.doc),
                    apply(transaction, decorationSet, _oldState, newState) {
                        if (transaction.docChanged) {
                            return buildSpellcheckDecorations(newState.doc);
                        }
                        return decorationSet.map(transaction.mapping, transaction.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return bilingualSpellcheckKey.getState(state);
                    },
                },
                appendTransaction(transactions, _oldState, newState) {
                    if (!transactions.some(transaction => transaction.docChanged) || transactions.some(transaction => transaction.getMeta(bilingualSpellcheckKey))) {
                        return null;
                    }

                    const correction = findAutoCorrectionBeforeCursor(newState);
                    if (!correction) {
                        return null;
                    }

                    return newState.tr
                        .insertText(correction.replacement, correction.from, correction.to)
                        .setMeta(bilingualSpellcheckKey, 'autocorrect');
                },
            }),
        ];
    },
});

export default function RichTextEditor({
    content,
    onChange,
}: {
    content: string;
    onChange: (value: string) => void;
}) {
    const feedback = useFeedback();
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                link: false,
                underline: false,
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
            }),
            Placeholder.configure({
                placeholder: 'Input decrypted data here...',
            }),
            BilingualSpellcheck,
        ],
        content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'min-h-[520px] w-full overflow-y-auto px-5 py-4 font-sans text-base leading-8 text-[#ddd] outline-none transition-colors focus:bg-[#0d0d0d] sm:px-6',
                autocapitalize: 'sentences',
                autocorrect: 'on',
                'aria-label': 'Writing content',
                lang: 'id-ID',
                spellcheck: 'false',
            },
        },
        onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    });

    useEffect(() => {
        if (!editor || editor.isFocused || editor.getHTML() === content) {
            return;
        }
        editor.commands.setContent(content || '', { emitUpdate: false });
    }, [content, editor]);

    const transformSelection = (mode: 'upper' | 'lower') => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        if (from === to) {
            feedback.toast('Pilih teks dulu untuk mengubah besar kecil huruf.', 'info');
            return;
        }
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        editor.chain().focus().insertContentAt({ from, to }, mode === 'upper' ? selectedText.toUpperCase() : selectedText.toLowerCase()).run();
    };

    const setLink = async () => {
        if (!editor) return;
        const url = await feedback.prompt({
            title: 'Pasang Link',
            message: 'Masukkan URL yang akan ditempel ke teks terpilih.',
            placeholder: 'https://example.com',
            confirmLabel: 'Apply Link',
            maxLength: 300,
        });
        if (!url) {
            return;
        }
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    };

    return (
        <section className="mx-auto w-full max-w-[1080px] border border-[#333] bg-[#0f0f0f]">
            <div className="flex flex-wrap gap-1.5 border-b border-[#252525] bg-[#111] p-2">
                <EditorButton active={editor?.isActive('bold')} icon={<Bold size={14} />} label="Bold" onClick={() => editor?.chain().focus().toggleBold().run()} />
                <EditorButton active={editor?.isActive('italic')} icon={<Italic size={14} />} label="Italic" onClick={() => editor?.chain().focus().toggleItalic().run()} />
                <EditorButton active={editor?.isActive('underline')} icon={<UnderlineIcon size={14} />} label="Underline" onClick={() => editor?.chain().focus().toggleUnderline().run()} />
                <EditorButton active={editor?.isActive('heading', { level: 1 })} icon={<Heading1 size={15} />} label="Heading 1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} />
                <EditorButton active={editor?.isActive('heading', { level: 2 })} icon={<Heading2 size={15} />} label="Heading 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} />
                <EditorButton active={editor?.isActive('paragraph')} icon={<Type size={14} />} label="Paragraph" onClick={() => editor?.chain().focus().setParagraph().run()} />
                <EditorButton active={editor?.isActive('bulletList')} icon={<List size={14} />} label="Bullet list" onClick={() => editor?.chain().focus().toggleBulletList().run()} />
                <EditorButton active={editor?.isActive('orderedList')} icon={<ListOrdered size={14} />} label="Number list" onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
                <EditorButton active={editor?.isActive('blockquote')} icon={<Quote size={14} />} label="Quote" onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
                <EditorButton active={editor?.isActive('link')} icon={<LinkIcon size={14} />} label="Link" onClick={() => void setLink()} />
                <EditorButton icon={<Undo2 size={14} />} label="Undo" onClick={() => editor?.chain().focus().undo().run()} />
                <EditorButton icon={<Redo2 size={14} />} label="Redo" onClick={() => editor?.chain().focus().redo().run()} />
                <EditorButton text="UPPER" label="Uppercase selection" onClick={() => transformSelection('upper')} />
                <EditorButton text="lower" label="Lowercase selection" onClick={() => transformSelection('lower')} />
            </div>
            <EditorContent
                editor={editor}
                className="writer-prose [&_.ProseMirror]:min-h-[520px] [&_.ProseMirror]:w-full [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:px-5 [&_.ProseMirror]:py-4 [&_.ProseMirror]:font-sans [&_.ProseMirror]:text-base [&_.ProseMirror]:leading-8 [&_.ProseMirror]:text-[#ddd] [&_.ProseMirror]:outline-none [&_.ProseMirror:focus]:bg-[#0d0d0d] sm:[&_.ProseMirror]:px-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#e60000] [&_blockquote]:pl-4 [&_h1]:text-4xl [&_h1]:font-black [&_h2]:text-2xl [&_h2]:font-black [&_ol]:list-decimal [&_ol]:pl-8 [&_ul]:list-disc [&_ul]:pl-8"
            />
            <div className="border-t border-[#222] px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-[#555]">
                ProseMirror protocol // bilingual ID+EN spellcheck // autocorrect // headings, bold, italic, underline, link, quote, lists, undo, redo
            </div>
        </section>
    );
}

function buildSpellcheckDecorations(doc: ProseMirrorNode) {
    const decorations: Decoration[] = [];

    doc.descendants((node, position) => {
        if (!node.isText || !node.text) {
            return;
        }

        for (const token of getSpellTokens(node.text)) {
            if (!isMisspelledWord(token.word)) {
                continue;
            }

            decorations.push(Decoration.inline(
                position + token.index,
                position + token.index + token.word.length,
                {
                    class: 'writer-spell-error',
                    title: 'Possible typo',
                },
            ));
        }
    });

    return DecorationSet.create(doc, decorations);
}

function findAutoCorrectionBeforeCursor(state: Parameters<NonNullable<Plugin['spec']['appendTransaction']>>[2]) {
    const { selection } = state;
    if (!selection.empty || selection.from <= 1) {
        return null;
    }

    const cursor = selection.from;
    const boundary = state.doc.textBetween(cursor - 1, cursor, '\n', '\n');
    if (!BOUNDARY_PATTERN.test(boundary)) {
        return null;
    }

    const $cursor = state.doc.resolve(cursor - 1);
    const textBefore = $cursor.parent.textBetween(0, $cursor.parentOffset, '\n', '\n');
    const match = textBefore.match(/([\p{L}]+(?:['\u2018\u2019-][\p{L}]+)*)$/u);
    if (!match?.[1]) {
        return null;
    }

    const replacement = getAutoCorrection(match[1]);
    if (!replacement || replacement === match[1]) {
        return null;
    }

    return {
        from: cursor - 1 - match[1].length,
        replacement,
        to: cursor - 1,
    };
}

function EditorButton({ icon, text, label, active = false, onClick }: { icon?: ReactNode; text?: string; label: string; active?: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            title={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={`flex h-8 min-w-8 items-center justify-center border px-2 font-mono text-[9px] font-black uppercase transition-all hover:border-[#e60000] hover:bg-[#e60000] hover:text-white ${
                active ? 'border-[#e60000] bg-[#e60000] text-white' : 'border-[#2a2a2a] text-[#888]'
            }`}
        >
            {icon ?? text}
        </button>
    );
}
