"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMarket } from "@/hooks/useMarket";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MarketAccount, BetAccount } from "@/lib/program";
import Navbar from "@/components/navbar";
import { EncryptedRangeInput } from "@/components/prediction/EncryptedRangeInput";
import { encryptValue } from "@inco/solana-sdk/encryption";
import Link from "next/link";

export default function MarketDetailPage() {
    const { address } = useParams();
    const { publicKey } = useWallet();
    const { fetchMarketByPDA, fetchBet, submitBet, evaluateBet, decryptIsWinner, claimPrize, settleMarket, loading: hookLoading } = useMarket();

    const [market, setMarket] = useState<MarketAccount | null>(null);
    const [bet, setBet] = useState<BetAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [evaluating, setEvaluating] = useState(false);

    const [range, setRange] = useState({ min: 0, max: 0 });
    const [amount, setAmount] = useState(1);
    const [winnerStatus, setWinnerStatus] = useState<{ checked: boolean; isWinner: boolean } | null>(null);

    const loadData = useCallback(async () => {
        if (!address) return;
        try {
            const mPDA = new PublicKey(address as string);
            const mAcc = await fetchMarketByPDA(mPDA);
            setMarket(mAcc);

            if (publicKey) {
                const bAcc = await fetchBet(mPDA, publicKey);
                setBet(bAcc);
            }
        } finally {
            setLoading(false);
        }
    }, [address, publicKey, fetchMarketByPDA, fetchBet]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async () => {
        if (!publicKey || !market || !address) return;
        setSubmitting(true);
        try {
            const encryptedMin = await encryptValue(range.min);
            const encryptedMax = await encryptValue(range.max);
            const encryptedAmount = await encryptValue(amount);

            await submitBet(
                new PublicKey(address as string),
                Buffer.from(encryptedMin),
                Buffer.from(encryptedMax),
                Buffer.from(encryptedAmount),
                amount // Plaintext amount
            );
            await loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEvaluate = async () => {
        if (!address) return;
        setEvaluating(true);
        try {
            const result = await evaluateBet(new PublicKey(address as string));
            if (result) {
                const decrypted = await decryptIsWinner(result.isWinnerHandle);
                if (decrypted) {
                    setWinnerStatus({ checked: true, isWinner: decrypted.isWinner });
                }
            }
            await loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setEvaluating(false);
        }
    };

    const isExpired = market ? market.endTimestamp.toNumber() < Date.now() / 1000 : false;
    const isAuthority = market && publicKey && market.authority.equals(publicKey);

    return (
        <>
            <Navbar />
            <main className="pt-32 px-8 pb-20 max-w-4xl mx-auto">
                <div className="mb-12">
                    <Link href="/" className="text-xs text-white/30 hover:text-white mb-4 block transition-colors">← Back to Markets</Link>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-5xl font-light mb-2">{market?.assetSymbol || "Loading..."} Market</h1>
                            <p className="text-white/20 text-sm font-mono">{address}</p>
                        </div>
                        {isAuthority && !market?.isSettled && isExpired && (
                            <button
                                onClick={() => settleMarket(new PublicKey(address as string))}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm transition-all"
                            >
                                Settle Market (Oracle Call)
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-[1fr_320px]">
                    <div className="space-y-8">
                        {!bet ? (
                            <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 shadow-2xl">
                                <h2 className="text-xl font-light mb-8">Place Confidential Prediction</h2>
                                <EncryptedRangeInput
                                    assetSymbol={market?.assetSymbol || "BTC"}
                                    onRangeChange={(min, max) => setRange({ min, max })}
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || isExpired || !publicKey}
                                    className="w-full mt-10 py-4 bg-[#3673F5] text-white font-medium rounded-2xl hover:bg-[#3673F5]/90 transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(54,115,245,0.2)]"
                                >
                                    {submitting ? "Encrypting & Submitting..." : isExpired ? "Market Closed" : "Submit Prediction"}
                                </button>
                            </section>
                        ) : (
                            <section className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="text-[10px] uppercase tracking-widest px-3 py-1 bg-[#3673F5]/20 text-[#3673F5] rounded-full border border-[#3673F5]/30">Active Bet</span>
                                </div>
                                <h2 className="text-xl font-light mb-6">Your Prediction</h2>
                                <p className="text-white/40 text-sm mb-10">Your range and amount are stored as encrypted handles on-chain. Only you can evaluate the result.</p>

                                {market?.isSettled ? (
                                    <div className="space-y-6">
                                        {!winnerStatus?.checked ? (
                                            <button
                                                onClick={handleEvaluate}
                                                disabled={evaluating}
                                                className="w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-white/90 transition-all shadow-xl"
                                            >
                                                {evaluating ? "Evaluating FHE..." : "Check Result"}
                                            </button>
                                        ) : (
                                            <div className={`p-8 rounded-2xl border ${winnerStatus.isWinner ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                                <p className="text-center font-medium text-lg mb-2">
                                                    {winnerStatus.isWinner ? "You won! 🎉" : "Prediction incorrect."}
                                                </p>
                                                {winnerStatus.isWinner && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!address || !winnerStatus) return;
                                                            const res = await evaluateBet(new PublicKey(address as string));
                                                            if (res) {
                                                                const dec = await decryptIsWinner(res.isWinnerHandle);
                                                                if (dec) {
                                                                    await claimPrize(
                                                                        new PublicKey(address as string),
                                                                        res.isWinnerHandle.toString(),
                                                                        dec.plaintext,
                                                                        dec.ed25519Instructions
                                                                    );
                                                                }
                                                            }
                                                            await loadData();
                                                        }}
                                                        className="w-full mt-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                                                    >Claim Prize</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                                        <p className="text-white/40 text-sm italic">Waiting for market settlement...</p>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    <aside className="space-y-6">
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                            <h3 className="text-xs uppercase tracking-widest text-white/30 mb-6">Market Stats</h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] uppercase text-white/20 mb-1">Participants</p>
                                    <p className="text-2xl font-light">{market?.participantCount || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-white/20 mb-1">Asset</p>
                                    <p className="text-2xl font-light">{market?.assetSymbol}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-white/20 mb-1">Status</p>
                                    <p className={`text-sm font-medium ${market?.isSettled ? "text-green-400" : "text-[#3673F5]"}`}>
                                        {market?.isSettled ? "Settled" : "Open"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-[#3673F5]/5 to-transparent">
                            <p className="text-[10px] uppercase tracking-widest text-[#3673F5] mb-2 font-semibold">FHE Privacy</p>
                            <p className="text-xs text-white/40 leading-relaxed">This market uses Fully Homomorphic Encryption. Payouts are determined on encrypted data without revealing your range to others.</p>
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}
