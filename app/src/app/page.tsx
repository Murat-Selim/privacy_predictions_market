"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMarket } from "@/hooks/useMarket";
import { MarketAccount } from "@/lib/program";
import { PublicKey } from "@solana/web3.js";

function MarketTimer({ endTimestamp }: { endTimestamp: number }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTimestamp - now;
      if (diff <= 0) {
        setIsExpired(true);
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTimestamp]);

  if (isExpired) {
    return null; // Timer hidden when expired
  }

  return (
    <span className="text-xs tabular-nums text-white/50">
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-pulse" />
        {timeLeft}
      </span>
    </span>
  );
}

function MarketCard({ market }: { market: { publicKey: PublicKey; account: MarketAccount }; isOpen: boolean }) {
  const isOpen = !market.account.isSettled;

  return (
    <Link
      href={`/market/${market.publicKey.toBase58()}`}
      className={`group relative border rounded-3xl p-7 transition-all duration-500 overflow-hidden card-glow ${isOpen
        ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/15"
        }`}
    >
      {/* Glow effect */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 blur-[45px] opacity-0 group-hover:opacity-100 transition-opacity ${isOpen ? "bg-[#2dd4bf]/20" : "bg-white/10"
        }`} />

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${isOpen
          ? "bg-[#2dd4bf]/10 text-[#2dd4bf] border-[#2dd4bf]/20"
          : "bg-white/10 text-white/60 border-white/15"
          }`}>
          <span className="flex items-center gap-1.5">
            {market.account.assetSymbol === "BTC" ? "₿" : "◎"}
            {market.account.assetSymbol}
          </span>
        </span>
        {isOpen ? (
          <MarketTimer endTimestamp={market.account.endTimestamp.toNumber()} />
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
            Settled
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className={`text-2xl font-light mb-2 transition-colors ${isOpen ? "group-hover:text-[#2dd4bf]" : "text-white/70"
        }`}>
        {market.account.assetSymbol} Market
      </h3>

      {/* Participant count */}
      <div className={`text-sm mb-8 flex items-center gap-2 ${isOpen ? "text-white/50" : "text-white/40"}`}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{market.account.participantCount} {isOpen ? "predicting" : "predicted"}</span>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t border-white/5 pt-6">
        <span className="text-xs text-white/20 truncate max-w-[100px] font-mono">
          {market.publicKey.toBase58().slice(0, 8)}...
        </span>
        <span className={`text-xs font-semibold flex items-center gap-1 transition-transform group-hover:translate-x-1 ${isOpen ? "text-[#2dd4bf]" : "text-white/50"
          }`}>
          {isOpen ? "Open Market" : "View Results"}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function MarketsList({ markets }: { markets: { publicKey: PublicKey; account: MarketAccount }[] }) {
  const now = Math.floor(Date.now() / 1000);

  // Live: Not settled AND time remaining
  const liveMarkets = markets.filter(
    (m) => !m.account.isSettled && m.account.endTimestamp.toNumber() > now
  );

  // Expired: Not settled AND time is up
  const expiredMarkets = markets.filter(
    (m) => !m.account.isSettled && m.account.endTimestamp.toNumber() <= now
  );

  // Settled: Explicitly marked as settled
  const settledMarkets = markets.filter((m) => m.account.isSettled);

  return (
    <div className="space-y-16">
      {/* Live Markets */}
      {liveMarkets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
              <h3 className="text-xs uppercase tracking-[0.25em] text-white/40 font-medium">
                Live Markets
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 text-[#2dd4bf] text-xs font-medium">
                {liveMarkets.length} active
              </span>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveMarkets.map((market) => (
              <MarketCard key={market.publicKey.toBase58()} market={market} isOpen={true} />
            ))}
          </div>
        </div>
      )}

      {/* Expired / Pending Settlement */}
      {expiredMarkets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500/50" />
              <h3 className="text-xs uppercase tracking-[0.25em] text-white/40 font-medium">
                Pending Settlement
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                {expiredMarkets.length} expired
              </span>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-80">
            {expiredMarkets.map((market) => (
              <MarketCard key={market.publicKey.toBase58()} market={market} isOpen={true} />
            ))}
          </div>
        </div>
      )}

      {/* Settled Markets */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <h3 className="text-xs uppercase tracking-[0.25em] text-white/40 font-medium">
              Market History
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs shadow-sm">
              {settledMarkets.length} settled
            </span>
          </div>
        </div>
        {settledMarkets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <svg className="w-12 h-12 mx-auto text-white/10 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white/40 text-sm">No settled markets yet</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {settledMarkets.map((market) => (
              <MarketCard key={market.publicKey.toBase58()} market={market} isOpen={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { fetchMarkets } = useMarket();
  const [markets, setMarkets] = useState<{ publicKey: PublicKey; account: MarketAccount }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchMarkets();
      setMarkets(data);
      setLoading(false);
    };
    load();
  }, [fetchMarkets]);

  return (
    <>
      <main className="pt-28 px-6 md:px-10 pb-20 max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-end mb-16">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 text-[#2dd4bf] text-xs uppercase tracking-[0.15em] font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-pulse" />
              FHE-Powered
            </div>
            <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-none mb-6">
              Encrypted
              <br />
              <span className="text-gradient">Prediction Markets</span>
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-xl leading-relaxed">
              Submit private ranges for BTC and SOL without revealing your position. Settlement happens on encrypted data.
            </p>
          </div>

          {/* Privacy Status Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 card-glow">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs uppercase tracking-[0.2em] text-[#2dd4bf] font-semibold">
                Privacy Status
              </p>
            </div>
            <p className="text-2xl font-light text-white mb-4">Encrypted by default.</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-white/40">
                <span>Market window</span>
                <span className="text-white/70 font-medium">60 minutes</span>
              </div>
              <div className="flex items-center justify-between text-white/40">
                <span>Encryption</span>
                <span className="text-[#2dd4bf] font-medium">FHE Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Markets Section */}
        <section>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 font-medium">
                Live Markets
              </h2>
              <p className="text-sm text-white/50 mt-2">
                Choose a market and place an encrypted prediction.
              </p>
            </div>
            <Link
              href="/create"
              className="btn btn-primary btn-md group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Market</span>
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 animate-pulse"
                >
                  <div className="flex justify-between mb-6">
                    <div className="h-7 bg-white/5 rounded-full w-16" />
                    <div className="h-5 bg-white/5 rounded w-16" />
                  </div>
                  <div className="h-8 bg-white/5 rounded-lg w-1/2 mb-4" />
                  <div className="h-4 bg-white/5 rounded w-1/3 mb-8" />
                  <div className="border-t border-white/5 pt-6 flex justify-between">
                    <div className="h-4 bg-white/5 rounded w-20" />
                    <div className="h-4 bg-white/5 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
              <svg className="w-16 h-16 mx-auto text-white/10 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-white/50 mb-2">No active markets yet.</p>
              <p className="text-white/30 text-sm mb-8">Be the first to create a prediction market</p>
              <Link
                href="/create"
                className="btn btn-primary btn-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Launch First Market</span>
              </Link>
            </div>
          ) : (
            <MarketsList markets={markets} />
          )}
        </section>
      </main>
    </>
  );
}
