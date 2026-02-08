"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMarket } from "@/hooks/useMarket";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MarketAccount, BetAccount } from "@/lib/program";
import { EncryptedRangeInput } from "@/components/prediction/EncryptedRangeInput";
import { encryptValue } from "@inco/solana-sdk/encryption";

function MarketTimer({ endTimestamp, onExpire }: { endTimestamp: number; onExpire?: () => void }) {
    const [timeLeft, setTimeLeft] = useState("");
    const [isExpired, setIsExpired] = useState(false);
    const expiredRef = useRef(false);
    const onExpireRef = useRef(onExpire);

    // Keep the ref updated with latest callback
    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const diff = endTimestamp - now;
            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft("Ended");
                if (!expiredRef.current && onExpireRef.current) {
                    expiredRef.current = true;
                    onExpireRef.current();
                }
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
        return null; // Don't show timer when expired - the market will transition to closed view
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
            <span className="text-xs font-mono text-white/60">{timeLeft}</span>
        </div>
    );
}

// Closed Market View Component
function ClosedMarketView({
    market,
    bet,
    address,
    winnerStatus,
    evaluating,
    claiming,
    error,
    onEvaluate,
    onClaim,
    onErrorDismiss
}: {
    market: MarketAccount;
    bet: BetAccount | null;
    address: string;
    winnerStatus: { checked: boolean; isWinner: boolean } | null;
    evaluating: boolean;
    claiming: boolean;
    error: string | null;
    onEvaluate: () => void;
    onClaim: () => void;
    onErrorDismiss: () => void;
}) {
    const router = useRouter();
    return (
        <main className="pt-28 px-6 md:px-10 pb-20 max-w-5xl mx-auto">
            {/* Back Button */}
            <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all mb-6 group cursor-pointer"
                aria-label="Back to markets"
            >
                <svg
                    className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back to Markets</span>
            </a>

            {/* Settled Header Banner */}
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border border-green-500/20">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-light">
                                {market.assetSymbol} Market — <span className="text-green-400">Settled</span>
                            </h1>
                            <p className="text-white/40 text-sm mt-1">This market has been settled. Results are now available.</p>
                        </div>
                    </div>
                    <span className="px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
                        ✓ Settlement Complete
                    </span>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-400">{error}</p>
                    <button onClick={onErrorDismiss} className="ml-auto text-red-400 hover:text-red-300">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Main Content */}
                <div className="space-y-6">
                    {/* Market Summary Card */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                        <h2 className="text-xs uppercase tracking-[0.2em] text-white/30 font-medium mb-6">Market Summary</h2>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                <p className="text-xs text-white/40 mb-1">Asset</p>
                                <p className="text-2xl font-light flex items-center gap-2">
                                    {market.assetSymbol === "BTC" ? "₿" : "◎"} {market.assetSymbol}
                                </p>
                            </div>
                            <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                <p className="text-xs text-white/40 mb-1">Total Participants</p>
                                <p className="text-2xl font-light">{market.participantCount}</p>
                            </div>
                            <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                                <p className="text-xs text-white/40 mb-1">Status</p>
                                <p className="text-2xl font-light text-green-400">Settled</p>
                            </div>
                        </div>
                    </div>

                    {/* User's Bet Result */}
                    {bet ? (
                        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-light">Your Prediction Result</h2>
                                    <p className="text-xs text-white/40">Check if your prediction was correct</p>
                                </div>
                            </div>

                            {!winnerStatus?.checked ? (
                                <div className="space-y-4">
                                    <p className="text-white/50 text-sm p-4 bg-white/[0.02] rounded-xl border border-white/5">
                                        Your encrypted prediction is stored on-chain. Click below to decrypt and check your result.
                                    </p>
                                    <button
                                        onClick={onEvaluate}
                                        disabled={evaluating}
                                        className="w-full btn btn-xl"
                                        style={{
                                            background: "#fff",
                                            color: "#000",
                                            boxShadow: "0 15px 35px rgba(255, 255, 255, 0.15)",
                                        }}
                                    >
                                        {evaluating ? (
                                            <>
                                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                <span>Decrypting with FHE...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                <span>Check My Result</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className={`p-8 rounded-2xl border text-center ${winnerStatus.isWinner
                                    ? "bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30"
                                    : "bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20"
                                    }`}>
                                    <div className="mb-4">
                                        {winnerStatus.isWinner ? (
                                            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                                <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className={`text-3xl font-light mb-2 ${winnerStatus.isWinner ? "text-green-400" : "text-red-400"}`}>
                                        {winnerStatus.isWinner ? "🎉 You Won!" : "Not This Time"}
                                    </h3>
                                    <p className="text-white/50 text-sm mb-6">
                                        {winnerStatus.isWinner
                                            ? "Congratulations! Your prediction was correct. Claim your prize below."
                                            : "Your prediction was outside the final price range. Better luck next time!"}
                                    </p>

                                    {winnerStatus.isWinner && (
                                        <button
                                            onClick={onClaim}
                                            disabled={claiming}
                                            className="btn btn-xl btn-success"
                                        >
                                            {claiming ? (
                                                <>
                                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    <span>Claiming Prize...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Claim Prize</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-light text-white/60 mb-2">No Prediction Placed</h3>
                            <p className="text-white/40 text-sm">
                                You didn't place a prediction on this market.
                            </p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                    {/* Market Info */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                        <h3 className="text-xs uppercase tracking-[0.2em] text-white/30 mb-6 font-medium">Market Info</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-xs text-white/40">Market ID</span>
                                <span className="text-xs text-white/60 font-mono truncate max-w-[120px]">{address.slice(0, 8)}...</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-xs text-white/40">Participants</span>
                                <span className="text-sm text-white/80">{market.participantCount}</span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-xs text-white/40">Status</span>
                                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                                    Settled
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* FHE Privacy Info */}
                    <div className="p-6 rounded-3xl border border-[#2dd4bf]/15 bg-gradient-to-br from-[#2dd4bf]/10 to-transparent">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p className="text-xs uppercase tracking-[0.15em] text-[#2dd4bf] font-semibold">Privacy Preserved</p>
                        </div>
                        <p className="text-xs text-white/45 leading-relaxed">
                            All predictions remained encrypted throughout the market. Only you can view your own result.
                        </p>
                    </div>

                    {/* Back to Markets */}
                    <a
                        href="/"
                        className="block w-full text-center py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all text-sm font-medium cursor-pointer"
                    >
                        Browse Other Markets
                    </a>
                </aside>
            </div>
        </main>
    );
}

export default function MarketDetailPage() {
    const { address } = useParams();
    const router = useRouter();
    const { publicKey } = useWallet();
    const { fetchMarketByPDA, fetchBet, submitBet, evaluateBet, decryptIsWinner, claimPrize, settleMarket, error: marketError } = useMarket();

    const [market, setMarket] = useState<MarketAccount | null>(null);
    const [bet, setBet] = useState<BetAccount | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [settling, setSettling] = useState(false);
    const [autoSettling, setAutoSettling] = useState(false);

    const [range, setRange] = useState({ min: 0, max: 0 });
    const [amountSol, setAmountSol] = useState("1");
    const [winnerStatus, setWinnerStatus] = useState<{ checked: boolean; isWinner: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    const loadData = useCallback(async () => {
        if (!address) return;
        try {
            const mPDA = new PublicKey(address as string);
            console.log("Fetching market data for:", address);
            const mAcc = await fetchMarketByPDA(mPDA);
            console.log("Market data received:", mAcc ? "Success" : "Not Found");
            setMarket(mAcc);

            if (mAcc) {
                const expired = mAcc.endTimestamp.toNumber() < Date.now() / 1000;
                setIsExpired(expired);
            }

            if (publicKey) {
                console.log("Fetching bet for wallet:", publicKey.toBase58());
                const bAcc = await fetchBet(mPDA, publicKey);
                console.log("Bet status:", bAcc ? "Found" : "Not Found");
                setBet(bAcc);
            }
        } catch (err) {
            console.error("Error in loadData:", err);
        } finally {
            setLoading(false);
        }
    }, [address, publicKey, fetchMarketByPDA, fetchBet]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Ref to track if auto-settlement was attempted
    const autoSettleAttemptedRef = useRef(false);

    // Auto-settlement when market expires - using a stable callback
    const handleAutoSettle = useCallback(async () => {
        // Prevent multiple attempts
        if (autoSettleAttemptedRef.current) return;
        autoSettleAttemptedRef.current = true;

        if (!address || !publicKey) return;

        // Need to fetch fresh market data to check authority
        try {
            const mPDA = new PublicKey(address as string);
            const freshMarket = await fetchMarketByPDA(mPDA);

            if (!freshMarket || freshMarket.isSettled) return;
            if (!freshMarket.authority.equals(publicKey)) return;

            setAutoSettling(true);
            await settleMarket(mPDA);

            // Reload data after settlement
            const updatedMarket = await fetchMarketByPDA(mPDA);
            setMarket(updatedMarket);
        } catch (err: any) {
            console.error("Auto-settlement failed:", err);
        } finally {
            setAutoSettling(false);
        }
    }, [address, publicKey, fetchMarketByPDA, settleMarket]);

    const handleSubmit = async () => {
        if (!publicKey || !market || !address) return;
        const amountValue = Number(amountSol);
        if (!Number.isFinite(amountValue) || amountValue <= 0) return;
        setSubmitting(true);
        setError(null);
        try {
            const lamports = Math.round(amountValue * 1_000_000_000);
            const encryptedMin = await encryptValue(range.min);
            const encryptedMax = await encryptValue(range.max);
            const encryptedAmount = await encryptValue(lamports);

            await submitBet(
                new PublicKey(address as string),
                Buffer.from(encryptedMin),
                Buffer.from(encryptedMax),
                Buffer.from(encryptedAmount),
                lamports
            );
            await loadData();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to submit prediction");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEvaluate = async () => {
        if (!address) return;
        setEvaluating(true);
        setError(null);
        try {
            const result = await evaluateBet(new PublicKey(address as string));
            if (result) {
                console.log("Evaluation successful, handle:", result.isWinnerHandle.toString());
                const decrypted = await decryptIsWinner(result.isWinnerHandle);
                if (decrypted) {
                    setWinnerStatus({ checked: true, isWinner: decrypted.isWinner });
                } else {
                    // Decryption failed but evaluation succeeded - user can try again
                    console.log("Decryption returned null, but evaluation succeeded");
                }
            } else {
                // evaluateBet returned null - error should be set by the hook
                console.log("Evaluation returned null");
            }
            await loadData();
        } catch (err: any) {
            console.error("handleEvaluate error:", err);
            setError(err?.message || "Failed to evaluate bet. Please try again.");
        } finally {
            setEvaluating(false);
        }
    };

    const handleClaim = async () => {
        if (!address || !winnerStatus) return;
        setClaiming(true);
        setError(null);
        try {
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
                } else {
                    setError(null);
                }
            }
            await loadData();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to claim prize");
        } finally {
            setClaiming(false);
        }
    };

    const handleSettle = async () => {
        if (!address) return;
        setSettling(true);
        setError(null);
        try {
            await settleMarket(new PublicKey(address as string));
            await loadData();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to settle market");
        } finally {
            setSettling(false);
        }
    };

    const isAuthority = market && publicKey && market.authority.toBase58() === publicKey.toBase58();
    const amountValue = Number(amountSol);
    const isAmountValid = Number.isFinite(amountValue) && amountValue > 0;

    // Loading state
    if (loading) {
        return (
            <main className="pt-28 px-6 md:px-10 pb-20 max-w-5xl mx-auto">
                <div className="animate-pulse space-y-8">
                    <div className="h-8 bg-white/5 rounded-lg w-32" />
                    <div className="h-12 bg-white/5 rounded-xl w-64" />
                    <div className="h-96 bg-white/[0.03] rounded-3xl" />
                </div>
            </main>
        );
    }

    // Show closed market view if settled
    if (market?.isSettled) {
        return (
            <ClosedMarketView
                market={market}
                bet={bet}
                address={address as string}
                winnerStatus={winnerStatus}
                evaluating={evaluating}
                claiming={claiming}
                error={error || marketError}
                onEvaluate={handleEvaluate}
                onClaim={handleClaim}
                onErrorDismiss={() => setError(null)}
            />
        );
    }

    if (!market) {
        return (
            <main className="pt-28 px-6 md:px-10 pb-20 max-w-5xl mx-auto text-center">
                <h1 className="text-2xl font-light mb-4">Market Not Found</h1>
                <p className="text-white/40 mb-8">The market you are looking for does not exist or has been removed.</p>
                <a href="/" className="btn btn-secondary">Back to Markets</a>
            </main>
        );
    }

    // Open market view
    return (
        <>
            <main className="pt-28 px-6 md:px-10 pb-20 max-w-5xl mx-auto">
                {/* Back Button & Header */}
                <div className="mb-10">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.05] transition-all mb-6 group cursor-pointer"
                        aria-label="Back to markets"
                    >
                        <svg
                            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm">Back to Markets</span>
                    </a>

                    <div className="flex flex-wrap justify-between items-end gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 rounded-full bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 text-[#2dd4bf] text-xs font-semibold">
                                    {market?.assetSymbol}
                                </span>
                                {market && !market.isSettled && (
                                    <MarketTimer
                                        endTimestamp={market.endTimestamp.toNumber()}
                                        onExpire={() => {
                                            setIsExpired(true);
                                            if (isAuthority) handleAutoSettle();
                                        }}
                                    />
                                )}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-light mb-2 flex items-center gap-3">
                                {market?.assetSymbol || "Loading..."} Market
                                {isAuthority && (
                                    <span className="text-[10px] uppercase tracking-widest bg-[#2dd4bf]/20 text-[#2dd4bf] px-2 py-1 rounded-md border border-[#2dd4bf]/30">
                                        Creator
                                    </span>
                                )}
                            </h1>
                            <p className="text-white/25 text-sm font-mono truncate max-w-md">{address}</p>
                        </div>

                        {/* Settlement Section */}
                        {market && !market.isSettled && (
                            <button
                                onClick={handleSettle}
                                disabled={settling || autoSettling || !isExpired || !isAuthority}
                                className={`btn btn-md ${isExpired && isAuthority ? "btn-secondary" : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"}`}
                            >
                                {settling || autoSettling ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span>Initialising Settlement...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>
                                            {!isExpired
                                                ? "Waiting for Expiration..."
                                                : !isAuthority
                                                    ? "Waiting for Creator to Settle"
                                                    : "Settle Market"}
                                        </span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-400">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                    {/* Main Content */}
                    <div className="space-y-8">
                        {/* Price Chart - Always Visible */}
                        <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <EncryptedRangeInput
                                assetSymbol={market.assetSymbol}
                                onRangeChange={(min, max) => setRange({ min, max })}
                            />
                        </section>

                        {!bet ? (
                            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-light">Confirm Your Amount</h2>
                                        <p className="text-xs text-white/40">Set your bet amount for the selected range</p>
                                    </div>
                                </div>

                                {/* Bet Amount Input */}
                                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
                                            Bet Amount
                                        </label>
                                        <span className="text-xs text-white/40">Encrypted on submit</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={amountSol}
                                            onChange={(e) => setAmountSol(e.target.value)}
                                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xl font-light text-white/90 outline-none focus:border-[#2dd4bf]/30 transition-colors"
                                            placeholder="0.00"
                                        />
                                        <span className="text-lg text-white/50 font-medium">SOL</span>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || isExpired || !publicKey || !isAmountValid}
                                    className="w-full mt-8 btn btn-xl"
                                    style={{
                                        background: submitting ? "rgba(45, 212, 191, 0.7)" : (isExpired ? "rgba(255,255,255,0.1)" : "#2dd4bf"),
                                        color: isExpired ? "rgba(255,255,255,0.5)" : "#051414",
                                        boxShadow: isExpired ? "none" : "0 15px 35px rgba(45, 212, 191, 0.28)",
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <span>Encrypting & Submitting...</span>
                                        </>
                                    ) : isExpired ? (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span>Market Closed</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <span>Submit Encrypted Prediction</span>
                                        </>
                                    )}
                                </button>
                            </section>
                        ) : (
                            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 bg-[#2dd4bf]/15 text-[#2dd4bf] rounded-full border border-[#2dd4bf]/25 font-medium">
                                        Position Active
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-light">Prediction Received</h2>
                                        <p className="text-xs text-white/40">Stored as encrypted handles on-chain</p>
                                    </div>
                                </div>

                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
                                    <p className="text-white/50 text-sm">Waiting for market settlement...</p>
                                    <p className="text-white/30 text-[10px] mt-2 block italic">
                                        Your prediction range and amount are fully encrypted using FHE.
                                        Only you will be able to reveal the result once the market closes.
                                    </p>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        {/* Market Stats */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                            <h3 className="text-xs uppercase tracking-[0.2em] text-white/30 mb-6 font-medium">Market Stats</h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="text-xs text-white/40">Participants</span>
                                    </div>
                                    <p className="text-lg font-light">{market?.participantCount || 0}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-xs text-white/40">Asset</span>
                                    </div>
                                    <p className="text-lg font-light">{market?.assetSymbol}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-xs text-white/40">Status</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#2dd4bf]/10 text-[#2dd4bf]">
                                        Open
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* FHE Privacy Info */}
                        <div className="p-6 rounded-3xl border border-[#2dd4bf]/15 bg-gradient-to-br from-[#2dd4bf]/10 to-transparent">
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-5 h-5 text-[#2dd4bf]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <p className="text-xs uppercase tracking-[0.15em] text-[#2dd4bf] font-semibold">FHE Privacy</p>
                            </div>
                            <p className="text-xs text-white/45 leading-relaxed">
                                This market uses Fully Homomorphic Encryption. Payouts are determined on encrypted data without revealing your range to others.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}
