"use client";

import React, { useState } from "react";
import { useMarket } from "@/hooks/useMarket";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import Navbar from "@/components/navbar";
import { AssetSelector } from "@/components/prediction/AssetSelector";

export default function CreateMarketPage() {
  const { initializeMarket } = useMarket();
  const { publicKey } = useWallet();
  const router = useRouter();
  const [asset, setAsset] = useState("BTC");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      // Use Wrapped SOL (Native Token)
      const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
      const FEEDS = {
        BTC: new PublicKey("Hov6Q8D2yYv7LEmS6HnK1aym8M65v7Cg7eYGu2S12q94"),
        SOL: new PublicKey("J83w4HBb9BvY6Rof8qHjMioeS4ay4K3U594zG3k5zN67"),
      };

      const now = Math.floor(Date.now() / 1000);
      const tx = await initializeMarket(asset, now, WSOL_MINT, FEEDS[asset as keyof typeof FEEDS]);
      if (tx) {
        router.push("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-32 px-8 pb-20 max-w-2xl mx-auto">
        <h1 className="text-5xl font-light mb-12">Launch Market</h1>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 space-y-10">
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-widest text-white/30">Select Asset</label>
            <AssetSelector selected={asset} onSelect={setAsset} />
          </div>

          <div className="space-y-4">
            <label className="text-xs uppercase tracking-widest text-white/30">Duration</label>
            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-white/60">
              Fixed 1 Hour (3,600 seconds)
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleCreate}
              disabled={loading || !publicKey}
              className="w-full py-4 bg-[#3673F5] text-white font-medium rounded-2xl hover:bg-[#3673F5]/90 transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(54,115,245,0.2)]"
            >
              {loading ? "Initializing..." : "Create Confidential Market"}
            </button>
            {!publicKey && (
              <p className="text-center text-xs text-red-400/60 mt-4">Connect wallet to continue</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
