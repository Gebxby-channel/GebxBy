// import React from 'react';
//
// interface SuccessModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     title?: string;
//     message?: string;
//     details?: {
//         label: string;
//         value: string;
//     }[];
// }
//
// export default function SuccessModal({ isOpen, onClose, title, message, details }: SuccessModalProps) {
//     if (!isOpen) return null;
//
//     return (
//         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-mono">
//             {/* Modal Container */}
//             <div className="relative w-full max-w-md bg-[#111] border border-[#333] shadow-[0_0_50px_rgba(230,0,0,0.1)] overflow-hidden">
//
//                 {/* Tactical Top Bar */}
//                 <div className="h-1 bg-[#e60000] w-full"></div>
//                 <div className="flex justify-between items-center px-4 py-2 border-b border-[#222] bg-[#1a1a1a]">
//                     <span className="text-[10px] text-[#e60000] font-black tracking-[0.2em]">[[ SYSTEM_CONFIRMATION ]]</span>
//                     <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">✕</button>
//                 </div>
//
//                 <div className="p-8 flex flex-col items-center text-center">
//                     {/* Success Icon */}
//                     <div className="w-16 h-16 bg-[#e60000]/10 border border-[#e60000]/30 rounded-full flex items-center justify-center mb-6">
//                         <svg className="w-8 h-8 text-[#e60000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
//                         </svg>
//                     </div>
//
//                     <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">
//                         {title || "ENTRY AUTHORIZED"}
//                     </h2>
//
//                     <p className="text-[#888] text-sm mb-8 font-sans leading-relaxed">
//                         {message || "Data has been successfully encrypted and synchronized with the central database."}
//                     </p>
//
//                     {/* Technical Metadata Box */}
//                     {details && details.length > 0 && (
//                         <div className="w-full bg-[#0a0a0a] border border-[#222] p-4 mb-8 space-y-2">
//                             {details.map((item, idx) => (
//                                 <div key={idx} className="flex justify-between text-[10px] uppercase">
//                                     <span className="text-[#444] font-bold">{item.label}:</span>
//                                     <span className="text-sky-500 font-black">{item.value}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//
//                     {/* Action Button - Sesuai style Profile lu */}
//                     <button
//                         onClick={onClose}
//                         className="w-full bg-[#e60000] hover:bg-white hover:text-[#e60000] text-white font-black py-4 transition-all duration-300 uppercase text-xs tracking-[0.3em] shadow-[4px_4px_0px_#444] active:translate-y-1 active:shadow-none"
//                     >
//                         Continue Protocol
//                     </button>
//                 </div>
//
//                 {/* Footer Decor */}
//                 <div className="px-4 py-2 bg-[#0a0a0a] border-t border-[#222] flex justify-between items-center">
//                     <span className="text-[8px] text-[#222] font-black">STARS_OS_VER_2.6</span>
//                     <div className="flex gap-1">
//                         <div className="w-1 h-1 bg-[#e60000] animate-pulse"></div>
//                         <div className="w-1 h-1 bg-[#e60000] animate-pulse delay-75"></div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }