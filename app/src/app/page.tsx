"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useMarket } from "@/hooks/useMarket";
import { MarketAccount } from "@/lib/program";
import { PublicKey } from "@solana/web3.js";
import Navbar from "@/components/navbar";

export default function HomePage() {
  const { fetchMarkets } = useMarket();
  const [markets, setMarkets] = useState<
    { publicKey: PublicKey; account: MarketAccount }[]
  >([]);
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
      <Navbar />
      <main className="pt-32 px-8 pb-20 max-w-6xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-light tracking-tight leading-none mb-6">
          Price <span className="text-[#3673F5]">Prediction</span>
          <br />
          Markets
        </h1>
        <p className="text-white/40 text-lg md:text-xl max-w-xl mb-16">
          Confidential range predictions for BTC and SOL. Fully encrypted, fully private.
        </p>

        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/30">
              Active Markets
            </h2>
            <Link
              href="/create"
              className="text-xs text-[#3673F5] hover:underline"
            >
              Create New Market
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 animate-pulse"
                >
                  <div className="h-4 bg-white/5 rounded w-1/4 mb-6" />
                  <div className="h-8 bg-white/5 rounded w-1/2 mb-4" />
                  <div className="h-4 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl">
              <p className="text-white/40 mb-6">No active markets</p>
              <Link
                href="/create"
                className="inline-block px-8 py-3 bg-[#3673F5] text-white text-sm font-medium rounded-full hover:bg-[#3673F5]/90 transition-all shadow-[0_0_20px_rgba(54,115,245,0.3)]"
              >
                Launch First Market
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {markets.map((market) => (
                <Link
                  key={market.publicKey.toBase58()}
                  href={`/market/${market.publicKey.toBase58()}`}
                  className="group relative bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#3673F5]/10 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#3673F5]/10 text-[#3673F5] border border-[#3673F5]/20">
                      {market.account.assetSymbol}
                    </span>
                    <MarketTimer endTimestamp={market.account.endTimestamp.toNumber()} />
                  </div>

                  <h3 className="text-3xl font-light mb-2 group-hover:text-[#3673F5] transition-colors">
                    {market.account.assetSymbol} Market
                  </h3>
                  <p className="text-white/40 text-sm mb-8">
                    {market.account.participantCount} predicting
                  </p>

                  <div className="flex justify-between items-center border-t border-white/5 pt-6">
                    <span className="text-xs text-white/30 truncate max-w-[120px]">
                      {market.publicKey.toBase58()}
                    </span>
                    <span className="text-xs text-[#3673F5] font-medium group-hover:translate-x-1 transition-transform">
                      Prediction →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function MarketTimer({ endTimestamp }: { endTimestamp: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endTimestamp - now;
      if (diff <= 0) {
        setTimeLeft("Settling...");
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

  return <span className="text-xs text-white/40 tabular-nums">{timeLeft}</span>;
}
