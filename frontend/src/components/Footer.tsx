import type { ReactNode } from 'react';
import { Camera, ExternalLink, MessageCircle, PlayCircle } from 'lucide-react';

const feedbackUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfhB5-p7NRK4bSjE2lGFs-mFD9QTPSxzfnnp0IeElWWvTG50Q/viewform?usp=publish-editor';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="border-t border-[#2a2a2a] bg-[#111] px-6 py-8 font-mono text-[#777]">
            <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl">
                    <div className="mb-3 border-l-2 border-[#e60000] pl-3">
                        <p className="m-0 text-sm font-black uppercase tracking-widest text-white">CodeXAvernico</p>
                        <p className="m-0 mt-1 text-[9px] uppercase tracking-widest text-[#666]">Community archive // fan forum</p>
                    </div>
                    <p className="m-0 text-[10px] leading-5 text-[#666]">
                        © {year} GebxBy / CodeXAvernico. Tulisan original tetap milik masing-masing penulis. Resident Evil dan semua trademark terkait adalah milik Capcom. Forum ini fan-made dan tidak berafiliasi resmi dengan Capcom.
                    </p>
                </div>

                <div className="grid gap-3 text-[10px] font-black uppercase tracking-widest">
                    <FooterLink href="https://www.youtube.com/@GebxBy" icon={<PlayCircle size={14} />} label="Youtube" value="@GebxBy" />
                    <FooterLink href="https://www.instagram.com/gebxby/" icon={<Camera size={14} />} label="Instagram" value="@gebxby" />
                    <div className="flex items-center gap-2 text-[#555]">
                        <MessageCircle size={14} />
                        <span>Discord</span>
                        <span className="text-[#777]">Menyusul</span>
                    </div>
                    <FooterLink href={feedbackUrl} icon={<ExternalLink size={14} />} label="Feedback" value="Google Form" />
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, icon, label, value }: { href: string; icon: ReactNode; label: string; value: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-[#777] no-underline transition-colors hover:text-[#e60000]"
        >
            {icon}
            <span>{label}</span>
            <span className="text-white">{value}</span>
        </a>
    );
}
