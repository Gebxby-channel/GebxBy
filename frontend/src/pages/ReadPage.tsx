import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ReadPage() {
    const { id } = useParams();
    const [content, setContent] = useState<any>(null);
    const navigateBack = useNavigate();

    useEffect(() => {
        if (id) {
            axios.get(`http://localhost:9090/content/${id}`)
                .then(res => setContent(res.data))
                .catch(err => console.error("Gagal ambil detail", err));
        }
    }, [id]);

    if (!content) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500 font-mono animate-pulse">
            [ LOADING_SECURE_DATA... ]
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-zinc-300 font-sans p-6 md:p-20">
            <div className="max-w-3xl mx-auto bg-white/5 border border-zinc-800 p-8 md:p-16 relative overflow-hidden">
                {/* Watermark Umbrella Halus */}
                <div className="absolute top-10 right-10 opacity-5 pointer-events-none">
                    <svg width="100" height="100" viewBox="0 0 24 24" fill="red"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
                </div>

                <button
                    onClick={() => navigateBack('/')}
                    className="text-xs text-red-700 hover:text-red-500 font-mono mb-12 block transition-colors"
                >
                    [ ◀ TERMINATE_SESSION ]
                </button>

                <header className="mb-12 border-b border-zinc-800 pb-8">
                    <h1 className="text-4xl font-bold text-white mb-4 leading-tight">{content.head}</h1>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>FILE_NAME: {content.head.replace(/\s+/g, '_')}.DOCX</span>
                        <span>LOG_ID: {id}</span>
                    </div>
                </header>

                <article className="text-lg leading-relaxed text-zinc-400 whitespace-pre-wrap font-serif text-justify">
                    {content.paragrafs}
                </article>

                <footer className="mt-20 pt-8 border-t border-zinc-800 text-center">
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.5em]">End_Of_Document</p>
                </footer>
            </div>
        </div>
    );
}