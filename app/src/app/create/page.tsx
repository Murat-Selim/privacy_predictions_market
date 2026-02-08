"use client";

import { useState } from "react";
import { useMarket } from "@/hooks/useMarket";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { AssetSelector } from "@/components/prediction/AssetSelector";

const PUSH_ORACLE_PROGRAM_ID = new PublicKey(
  "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT"
);

function getPriceFeedAccountAddress(shardId: number, feedId: string): PublicKey {
  const hex = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  if (hex.length !== 64) {
    throw new Error("Feed ID should be 32 bytes long");
  }
  const feedIdBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    feedIdBytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const shardBytes = new Uint8Array(2);
  shardBytes[0] = shardId & 0xff;
  shardBytes[1] = (shardId >> 8) & 0xff;
  return PublicKey.findProgramAddressSync(
    [shardBytes, feedIdBytes],
    PUSH_ORACLE_PROGRAM_ID
  )[0];
}

export default function CreateMarketPage() {
  const { initializeMarket } = useMarket();
  const { publicKey } = useWallet();
  const router = useRouter();
  const [asset, setAsset] = useState("BTC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const FEED_IDS = {
        BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
      };

      const priceFeed = getPriceFeedAccountAddress(
        0,
        FEED_IDS[asset as keyof typeof FEED_IDS]
      );

      const now = Math.floor(Date.now() / 1000);
      const result = await initializeMarket(asset, now, priceFeed);

      if (result) {
        router.push(`/market/${result.marketPDA}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create market");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="pt-28 px-6 md:px-10 pb-20 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 mb-4">
            <svg className="w-4 h-4 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Market</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light mb-3">Launch Market</h1>
          <p className="text-white/50 text-sm max-w-md">
            Create a new encrypted prediction market in one transaction. All predictions are FHE-encrypted.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 md:p-10 space-y-8">
          {/* Asset Selection */}
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Select Asset
            </label>
            <AssetSelector selected={asset} onSelect={setAsset} />
          </div>

          {/* Duration Info */}
          <div className="space-y-4">
            <label className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Market Duration
            </label>
            <div className="flex items-center gap-4 p-4 bg-white/[0.04] border border-white/10 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center">
                <span className="text-[#2dd4bf] font-mono text-sm">1h</span>
              </div>
              <div>
                <p className="text-white/80 font-medium">Fixed 1 Hour</p>
                <p className="text-xs text-white/40">3,600 seconds until settlement</p>
              </div>
            </div>
          </div>

          {/* Privacy Info */}
          <div className="p-5 bg-gradient-to-br from-[#2dd4bf]/5 to-transparent border border-[#2dd4bf]/10 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2dd4bf]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[#2dd4bf] mb-1">FHE-Protected Market</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  All participant ranges are fully encrypted using Fully Homomorphic Encryption. Settlement and payout calculation runs entirely on encrypted data.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleCreate}
              disabled={loading || !publicKey}
              className={`btn btn-xl ${loading ? "btn-loading" : ""}`}
              style={{
                background: loading ? "rgba(45, 212, 191, 0.7)" : "#2dd4bf",
                color: "#051414",
                boxShadow: "0 15px 35px rgba(45, 212, 191, 0.28)",
              }}
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Creating Market...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Create Confidential Market</span>
                </>
              )}
            </button>
            {!publicKey && (
              <p className="text-center text-xs text-white/40 mt-4 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect wallet to continue
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
