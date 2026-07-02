import React from "react";
import { Building2 } from "lucide-react";

interface NavbarProps {
  onGoHome: () => void;
}

export default function Navbar({ onGoHome }: NavbarProps) {
  return (
    <nav className="bg-[#F7F3EE] border-b border-[#EAE4DB] px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm gap-2">
      <div 
        className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none active:opacity-80 shrink-0" 
        onClick={onGoHome}
      >
        <img src="/WIS%20Logo%20without%20BG.png" alt="WIS Logo" className="h-8 sm:h-10 w-auto object-contain" />
        <span className="text-xl sm:text-2xl font-serif italic font-semibold tracking-tight text-[#2D2A26]">WorkInSite</span>
      </div>
      <div className="shrink-0">
        <span className="bg-[#F1EBE2] text-[#4A453E] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-[#EAE4DB] shadow-sm whitespace-nowrap">
          Supervisor View
        </span>
      </div>
    </nav>
  );
}
