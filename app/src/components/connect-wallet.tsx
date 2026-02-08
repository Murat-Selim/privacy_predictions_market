"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const features = [
  {
    title: "Encrypted Ranges",
    copy: "Your prediction range stays hidden, even on-chain.",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "Transparent Payouts",
    copy: "Settlement happens with verifiable, encrypted logic.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Instant Access",
    copy: "Jump straight into live BTC and SOL markets.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];

const wallets = [
  { name: "Phantom", icon: "👻" },
  { name: "Solflare", icon: "🔆" },
  { name: "Ledger", icon: "🔐" },
  { name: "Backpack", icon: "🎒" },
];

export default function ConnectWallet() {
  const { setVisible } = useWalletModal();

  return (
    <main className="pt-28 px-6 pb-20 max-w-6xl mx-auto min-h-screen flex flex-col items-center justify-center">
      <div className="text-center max-w-2xl">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 text-[#2dd4bf] text-xs uppercase tracking-[0.2em] font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
            FHE-Powered Privacy
          </div>

          <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-none mb-6">
            Unlock
            <br />
            <span className="text-gradient">Private Markets</span>
          </h1>

          <p className="text-white/45 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Connect a Solana wallet to place encrypted predictions and settle results without revealing your range.
          </p>

          {/* Main CTA Button */}
          <button
            onClick={() => setVisible(true)}
            className="btn btn-primary btn-lg group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
            <span>Connect Wallet</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4 md:grid-cols-3 text-left mb-12">
          {features.map((item, index) => (
            <div
              key={item.title}
              className="group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/15 transition-all duration-300 card-glow"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white mb-2">{item.title}</p>
              <p className="text-xs text-white/45 leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </div>

        {/* Wallet Options */}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/30 mb-4">
            Supported Wallets
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => setVisible(true)}
                className="group flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border border-white/5 rounded-full text-xs text-white/50 hover:bg-white/[0.06] hover:border-white/15 hover:text-white/80 transition-all duration-300"
              >
                <span className="text-base group-hover:scale-110 transition-transform">{wallet.icon}</span>
                <span>{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
