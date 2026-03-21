import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ReadPage() {
    const { id } = useParams();
    const [content, setContent] = useState<any>(null);
    const navigateBack = useNavigate();

    useEffect(() => {
        if (id) {
            axios.get(`https://federal-wasp-gebxby-18a594b4.koyeb.app/content/${id}`)
                .then(res => setContent(res.data))
                .catch(err => console.error("Gagal ambil detail", err));
        }
    }, [id]);

    if (!content) return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-[#e60000] font-mono">
            <div className="animate-pulse flex flex-col items-center">
                <p className="mb-2 tracking-[0.5em]">[ DECRYPTING_SECURE_FILE ]</p>
                <div className="w-48 h-1 bg-[#1a1a1a] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#e60000] animate-[loading_2s_infinite]"></div>
                </div>
            </div>
            <style>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#111] text-[#eee] font-mono p-4 md:p-12 relative overflow-hidden">

            {/* Background Overlay (Efek Scanline Halus) */}
            <div className="pointer-events-none fixed inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%]"></div>

            <div className="max-w-4xl mx-auto relative z-20">

                {/* Status Bar Atas */}
                <div className="flex justify-between items-center mb-6 text-[#444] text-[10px] border-b border-[#222] pb-2">
                    <div className="flex gap-4">
                        <span className="text-[#e60000] font-bold">STATUS: ENCRYPTED_ACCESS</span>
                        <span>CLEARANCE: LEVEL_4</span>
                    </div>
                    <div className="hidden md:block">
                        TERMINAL_ID: CXA-00{id?.substring(0,2)}
                    </div>
                </div>

                {/* Tombol Kembali (Abort) */}
                <button
                    onClick={() => navigateBack('/')}
                    className="group mb-8 flex items-center gap-2 text-[#888] hover:text-white transition-all"
                >
                    <span className="text-[#e60000] group-hover:animate-ping inline-block">●</span>
                    <span className="text-xs font-black tracking-widest uppercase">{"[<]"} Return to Database</span>
                </button>

                {/* Kontainer Dokumen Utama */}
                <main className="bg-[#181818] border border-[#2a2a2a] relative shadow-2xl">

                    {/* Aksen Sudut Merah Umbrella */}


                    {/* Header Dokumen */}
                    <header className="p-8 md:p-12 border-b border-[#2a2a2a]">
                        <div className="mb-4">
                            <span className="bg-[#e60000] text-white text-[9px] font-black px-2 py-1 uppercase tracking-widest">
                                {content.kategori || "Classified"}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-none tracking-tighter uppercase break-words">
                            {content.head}
                        </h1>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px] text-[#666] uppercase font-bold">
                            <div className="flex flex-col">
                                <span>Subject_ID</span>
                                <span className="text-white">#{id?.substring(0, 8)}...</span>
                            </div>
                            <div className="flex flex-col">
                                <span>Author_Ref</span>
                                <span className="text-white">{content.user?.name || "Unknown"}</span>
                            </div>
                            <div className="flex flex-col">
                                <span>Format</span>
                                <span className="text-white">Digital_Archive</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span>Encryption</span>
                                <span className="text-[#e60000]">Active</span>
                            </div>
                        </div>
                    </header>

                    {/* Isi Artikel */}
                    <article className="p-8 md:p-12 text-lg leading-relaxed text-[#ccc] whitespace-pre-wrap font-sans text-justify selection:bg-[#e60000] selection:text-white">
                        {content.paragrafs}
                    </article>

                    {/* Footer Dokumen */}
                    <footer className="p-8 border-t border-[#2a2a2a] bg-[#1a1a1a]/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-[10px] text-[#444] font-bold uppercase tracking-[0.4em]">
                            End_Of_Transmission // {new Date().toLocaleDateString()}
                        </p>
                        <div className="text-[9px] text-[#e60000]/40 font-black animate-pulse uppercase">
                            Warning: Unauthorized duplication is punishable by termination
                        </div>
                    </footer>
                </main>

                {/* Navigasi Tambahan Bawah */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => window.print()}
                        className="text-[10px] text-[#444] hover:text-white border border-[#2a2a2a] px-4 py-2 uppercase tracking-widest transition-all"
                    >
                        Hardcopy_Printout [P]
                    </button>
                </div>
            </div>
        </div>
    );
}