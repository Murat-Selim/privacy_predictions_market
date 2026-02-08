"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const WalletButton = dynamic(() => import("./wallet-button"), {
  ssr: false,
  loading: () => (
    <div className="w-28 h-10 bg-white/5 rounded-full animate-pulse" />
  ),
});

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Markets", icon: "M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" },
    { href: "/create", label: "Launch", icon: "M12 4v16m8-8H4" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-10 py-4 bg-[#0b0e14]/85 backdrop-blur-xl border-b border-white/10">
      {/* Logo Section */}
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex flex-col leading-tight text-lg md:text-xl font-semibold tracking-tight group"
          aria-label="Go to home page"
        >
          <span className="transition-colors group-hover:text-[#2dd4bf]">confidential</span>
          <span className="text-sm md:text-base text-white/50 group-hover:text-white/70 transition-colors">markets</span>
        </Link>

        <div className="hidden md:flex items-center">
          <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#2dd4bf]/10 to-[#38bdf8]/10 border border-[#2dd4bf]/20 text-[10px] uppercase tracking-[0.2em] text-[#2dd4bf] font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2dd4bf] mr-2 animate-pulse" />
            Encrypted
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-full">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={link.icon} />
                </svg>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile navigation */}
        <div className="flex sm:hidden items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`p-2.5 rounded-full transition-all duration-300 ${isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                aria-label={link.label}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={link.icon} />
                </svg>
              </Link>
            );
          })}
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
