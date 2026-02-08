"use client";

import { useCallback, useState, useMemo, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    TransactionInstruction,
    ComputeBudgetProgram,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useProgram } from "./useProgram";
import {
    getMarketPDA,
    getBetPDA,
    getVaultPDA,
    INCO_LIGHTNING_PROGRAM_ID,
    MarketAccount,
    BetAccount,
    handleToBuffer,
    plaintextToBuffer,
} from "@/lib/program";
import { decrypt } from "@inco/solana-sdk/attested-decrypt";

function deriveAllowancePda(
    handle: bigint,
    allowedAddress: PublicKey
): [PublicKey, number] {
    const buf = Buffer.alloc(16);
    let v = handle;
    for (let i = 0; i < 16; i++) {
        buf[i] = Number(v & BigInt(0xff));
        v >>= BigInt(8);
    }
    return PublicKey.findProgramAddressSync(
        [buf, allowedAddress.toBuffer()],
        INCO_LIGHTNING_PROGRAM_ID
    );
}

export interface UseMarketReturn {
    loading: boolean;
    error: string | null;
    fetchMarkets: () => Promise<{ publicKey: PublicKey; account: MarketAccount }[]>;
    fetchMarketByPDA: (marketPDA: PublicKey) => Promise<MarketAccount | null>;
    fetchBet: (marketPDA: PublicKey, owner: PublicKey) => Promise<BetAccount | null>;
    initializeMarket: (assetSymbol: string, startTimestamp: number, price_feed: PublicKey) => Promise<{ tx: string, marketPDA: string } | null>;
    submitBet: (marketPDA: PublicKey, encryptedMin: Buffer, encryptedMax: Buffer, encryptedAmount: Buffer, amount: number) => Promise<string | null>;
    settleMarket: (marketPDA: PublicKey) => Promise<string | null>;
    evaluateBet: (marketPDA: PublicKey) => Promise<{ tx: string; isWinnerHandle: bigint } | null>;
    decryptIsWinner: (handle: bigint) => Promise<{ isWinner: boolean; plaintext: string; ed25519Instructions: TransactionInstruction[] } | null>;
    claimPrize: (marketPDA: PublicKey, isWinnerHandle: string, plaintext: string, ed25519Instructions: TransactionInstruction[]) => Promise<string | null>;
}

export function useMarket(): UseMarketReturn {
    const program = useProgram();
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const decryptInFlightRef = useRef(false);
    const signCacheRef = useRef<Map<string, Uint8Array>>(new Map());
    const signInFlightRef = useRef<Map<string, Promise<Uint8Array>>>(new Map());
    const signCooldownUntilRef = useRef(0);

    const publicKey = useMemo(() => wallet?.publicKey ?? null, [wallet?.publicKey]);
    const signMessage = useMemo(() => wallet?.signMessage ?? null, [wallet?.signMessage]);
    const signTransaction = useMemo(() => wallet?.signTransaction ?? null, [wallet?.signTransaction]);

    const fetchMarkets = useCallback(async (): Promise<{ publicKey: PublicKey; account: MarketAccount }[]> => {
        if (!program) return [];
        try {
            const accounts = await program.account.market.all();
            return (accounts as unknown) as { publicKey: PublicKey; account: MarketAccount }[];
        } catch (err) {
            console.error("Error fetching markets:", err);
            return [];
        }
    }, [program]);

    const fetchMarketByPDA = useCallback(async (marketPDA: PublicKey): Promise<MarketAccount | null> => {
        if (!program) return null;
        try {
            const account = await program.account.market.fetch(marketPDA);
            return (account as unknown) as MarketAccount;
        } catch (err) {
            return null;
        }
    }, [program]);

    const fetchBet = useCallback(async (marketPDA: PublicKey, owner: PublicKey): Promise<BetAccount | null> => {
        if (!program) return null;
        try {
            const [betPDA] = getBetPDA(marketPDA, owner);
            const account = await program.account.bet.fetch(betPDA);
            return (account as unknown) as BetAccount;
        } catch {
            return null;
        }
    }, [program]);

    const initializeMarket = useCallback(async (assetSymbol: string, startTimestamp: number, price_feed: PublicKey): Promise<{ tx: string, marketPDA: string } | null> => {
        if (!program || !publicKey) {
            console.error("Program or Wallet not initialized", { program: !!program, publicKey: !!publicKey });
            return null;
        }
        setLoading(true);
        setError(null);
        try {
            const [marketPDA] = getMarketPDA(publicKey, assetSymbol);
            const [vaultPDA] = getVaultPDA(marketPDA);

            console.log("Initializing market...", {
                assetSymbol,
                startTimestamp,
                marketPDA: marketPDA.toBase58(),
                vaultPDA: vaultPDA.toBase58(),
                priceFeed: price_feed.toBase58()
            });

            // Use a 10s buffer to avoid "start time in past" errors
            const bufferedStart = new BN(startTimestamp).add(new BN(10));

            const tx = await program.methods
                .initializeMarket(assetSymbol, bufferedStart)
                .accounts({
                    authority: publicKey,
                    market: marketPDA,
                    vault: vaultPDA,
                    systemProgram: SystemProgram.programId,
                    priceFeed: price_feed,
                })
                .rpc();

            console.log("Market initialized successfully, tx:", tx);
            return { tx, marketPDA: marketPDA.toBase58() };
        } catch (err: any) {
            console.error("Error in initializeMarket:", err);
            const [marketPDA] = getMarketPDA(publicKey, assetSymbol);

            // If account already exists, we can still "succeed" by redirecting to it
            if (err.message.includes("already in use") || err.logs?.some((l: string) => l.includes("already in use"))) {
                console.log("Market already exists, redirecting to existing market");
                return { tx: "ALREADY_EXISTS", marketPDA: marketPDA.toBase58() };
            }

            setError(err.message || "Failed to initialize market");
            return null;
        } finally {
            setLoading(false);
        }
    }, [program, publicKey]);

    const submitBet = useCallback(async (marketPDA: PublicKey, encryptedMin: Buffer, encryptedMax: Buffer, encryptedAmount: Buffer, amount: number): Promise<string | null> => {
        if (!program || !publicKey) return null;
        setLoading(true);
        try {
            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const [vaultPDA] = getVaultPDA(marketPDA);

            const tx = await program.methods
                .submitBet(encryptedMin, encryptedMax, encryptedAmount, new BN(amount))
                .accounts({
                    buyer: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    vault: vaultPDA,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            return tx;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [program, publicKey]);

    const settleMarket = useCallback(async (marketPDA: PublicKey): Promise<string | null> => {
        if (!program || !publicKey) return null;
        setLoading(true);
        setError(null);
        try {
            console.log("Fetching market for settlement...", marketPDA.toBase58());
            const marketAcc = (await program.account.market.fetch(marketPDA)) as MarketAccount;
            const priceFeed = marketAcc.priceFeed;

            // Optional: check if it's actually expired
            const now = Math.floor(Date.now() / 1000);
            if (marketAcc.endTimestamp.toNumber() > now) {
                const wait = marketAcc.endTimestamp.toNumber() - now;
                throw new Error(`Market hasn't expired yet. Please wait ${wait} seconds.`);
            }

            if (!marketAcc.authority.equals(publicKey)) {
                throw new Error("Only the market authority can settle this market.");
            }

            console.log("Performing settlement with high compute units...");

            const tx = await program.methods
                .settleMarket()
                .accounts({
                    authority: publicKey,
                    market: marketPDA,
                    priceFeed: priceFeed,
                    systemProgram: SystemProgram.programId,
                    incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
                })
                .preInstructions([
                    ComputeBudgetProgram.setComputeUnitLimit({
                        units: 1_000_000,
                    }),
                ])
                .rpc();

            console.log("Settlement successful, tx:", tx);
            return tx;
        } catch (err: any) {
            console.error("Settlement error:", err);
            let msg = err.message || "Settlement failed";
            if (msg.includes("already settled")) msg = "Market is already settled.";
            if (msg.includes("Clock skew")) msg = "Cluster clock skew detected. Please try again in 30 seconds.";
            if (msg.includes("custom program error: 0x0")) msg = "Market might already be settled or price feed is unavailable.";
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [program, publicKey]);

    const getEvaluateHandle = useCallback(async (marketPDA: PublicKey): Promise<bigint | null> => {
        if (!program || !publicKey) return null;
        try {
            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const [allowancePda] = deriveAllowancePda(BigInt(0), publicKey);

            const ix = await (program.methods
                .evaluateBet()
                .accounts({
                    actor: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    systemProgram: SystemProgram.programId,
                    incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
                })
                .remainingAccounts([
                    { pubkey: allowancePda, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: false, isWritable: false },
                ]) as any).instruction();

            const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 });
            const { blockhash } = await connection.getLatestBlockhash();
            const messageV0 = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: blockhash,
                instructions: [computeIx, ix],
            }).compileToV0Message();
            const versionedTx = new VersionedTransaction(messageV0);
            const sim = await connection.simulateTransaction(versionedTx, { sigVerify: false, replaceRecentBlockhash: true });

            console.log("Simulating evaluate_bet logs:", sim.value.logs);
            console.log("Simulation result:", sim.value.err ? "Error" : "Success");

            // Look for the result handle in logs - try multiple patterns
            for (const log of sim.value.logs || []) {
                // Try "Result handle:" with capital R (from msg! macro)
                if (log.includes("Result handle:")) {
                    const match = log.match(/Result handle:\s*(\d+)/);
                    if (match) {
                        console.log("Found handle in simulation (pattern 1):", match[1]);
                        return BigInt(match[1]);
                    }
                }
                // Try lowercase fallback
                if (log.toLowerCase().includes("result handle:")) {
                    const match = log.match(/(\d+)/);
                    if (match) {
                        console.log("Found handle in simulation (pattern 2):", match[1]);
                        return BigInt(match[1]);
                    }
                }
            }

            // If simulation logs don't contain the handle, check if bet already has a valid handle
            console.log("No handle in simulation logs, checking on-chain bet account...");
            const betAccount = await program.account.bet.fetch(betPDA).catch(() => null);
            if (betAccount) {
                const handle = BigInt((betAccount as any).isWinnerHandle?.toString() || "0");
                if (handle > 0) {
                    console.log("Found existing handle on-chain:", handle.toString());
                    return handle;
                }
            }

            console.warn("No result handle found in simulation logs or on-chain");
            return null;
        } catch (err) {
            console.error("getEvaluateHandle simulation failed:", err);
            return null;
        }
    }, [program, publicKey, connection]);

    const evaluateBet = useCallback(async (marketPDA: PublicKey): Promise<{ tx: string; isWinnerHandle: bigint } | null> => {
        if (!program || !publicKey) return null;
        setLoading(true);
        try {
            const [betPDA] = getBetPDA(marketPDA, publicKey);

            // Try to get handle from simulation first (for pre-computing allowance PDA)
            // But if simulation fails, we'll still proceed and get the handle from on-chain after
            const simulatedHandle = await getEvaluateHandle(marketPDA);
            let allowancePda: PublicKey;

            if (simulatedHandle) {
                [allowancePda] = deriveAllowancePda(simulatedHandle, publicKey);
            } else {
                // Fallback: use a dummy handle (0) to derive a placeholder PDA
                // The actual allowance will be created by the program with the correct handle
                [allowancePda] = deriveAllowancePda(BigInt(0), publicKey);
                console.warn("Simulation didn't return handle, proceeding with fallback PDA");
            }

            console.log("Executing evaluateBet transaction...");
            const tx = await program.methods
                .evaluateBet()
                .accounts({
                    actor: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    systemProgram: SystemProgram.programId,
                    incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
                })
                .remainingAccounts([
                    { pubkey: allowancePda, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: false, isWritable: false },
                ])
                .preInstructions([
                    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
                ])
                .rpc();

            console.log("Transaction confirmed:", tx);

            // Read the actual handle from the on-chain bet account
            const betAccount = await program.account.bet.fetch(betPDA) as unknown as BetAccount;
            const actualHandle = BigInt(betAccount.isWinnerHandle.toString());

            if (actualHandle === BigInt(0)) {
                throw new Error("Evaluation returned invalid handle (0). Please try again.");
            }

            if (simulatedHandle && actualHandle !== simulatedHandle) {
                console.warn("Handle mismatch — simulation:", simulatedHandle.toString(), "on-chain:", actualHandle.toString());
            }
            console.log("Using on-chain isWinnerHandle:", actualHandle.toString());

            return { tx, isWinnerHandle: actualHandle };
        } catch (err: any) {
            console.error("evaluateBet error:", err);
            const msg = err.message || "Failed to evaluate bet";
            if (msg.includes("MarketStillOpen")) {
                setError("Market must be settled before checking results.");
            } else if (msg.includes("NotChecked") || msg.includes("not evaluated")) {
                setError("Please evaluate your bet first.");
            } else {
                setError(msg);
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, [program, publicKey, getEvaluateHandle]);

    const decryptIsWinner = useCallback(async (handle: bigint): Promise<{ isWinner: boolean; plaintext: string; ed25519Instructions: TransactionInstruction[] } | null> => {
        if (!publicKey || !signMessage) {
            console.error("Wallet not ready for decryption");
            return null;
        }

        if (decryptInFlightRef.current) {
            setError("Decryption already in progress. Please wait.");
            return null;
        }
        if (Date.now() < signCooldownUntilRef.current) {
            setError("Please wait a few seconds before trying again.");
            return null;
        }
        decryptInFlightRef.current = true;
        try {
            let signCallCount = 0;
            console.log("Decrypting handle:", handle.toString());
            const signMessageOnce = async (message: Uint8Array) => {
                signCallCount += 1;
                if (signCallCount > 1) {
                    // Prevent repeated wallet prompts within a single decrypt call.
                    throw new Error("SIGN_PROMPT_ALREADY_SHOWN");
                }
                const key = Buffer.from(message).toString("base64");
                const cached = signCacheRef.current.get(key);
                if (cached) return cached;
                const existing = signInFlightRef.current.get(key);
                if (existing) return existing;

                const promise = (async () => {
                    const sig = await (signMessage as any)(message);
                    signCacheRef.current.set(key, sig);
                    return sig;
                })();

                signInFlightRef.current.set(key, promise);
                try {
                    return await promise;
                } finally {
                    signInFlightRef.current.delete(key);
                }
            };

            const result = await decrypt([handle.toString()], {
                address: publicKey,
                signMessage: signMessageOnce as any,
            });
            console.log("Decryption result:", result);
            const isWinner = result.plaintexts[0] === "1";
            return {
                isWinner,
                plaintext: result.plaintexts[0] as string,
                ed25519Instructions: (result.ed25519Instructions as unknown) as TransactionInstruction[]
            };
        } catch (err: any) {
            const errMsg = err?.message || String(err);
            const errName =
                err?.name ||
                err?.constructor?.name ||
                "";
            const extraMsg = [
                err?.error?.message,
                err?.cause?.message,
                err?.error?.toString?.()
            ].filter(Boolean).join(" ");
            const combined = `${errName} ${errMsg} ${extraMsg}`.toLowerCase();
            const isUserRejected =
                errName === "WalletSignMessageError" ||
                err?.code === 4001 ||
                combined.includes("user rejected") ||
                combined.includes("user denied") ||
                combined.includes("rejected the request");

            if (isUserRejected) {
                // Treat user cancellation as a non-error to avoid noisy logs.
                console.info("Signature request was cancelled by the user.");
                setError("Signature request was cancelled.");
                signCooldownUntilRef.current = Date.now() + 15000;
                return null;
            }

            const isNotFound = errMsg.includes("No ciphertext found") ||
                String(err).includes("No ciphertext found");

            if (isNotFound) {
                setError("Result not indexed yet. Please try again in a few seconds.");
                return null;
            }

            if (combined.includes("sseerror") || combined.includes("inpage")) {
                setError("Wallet extension error. Please refresh and reconnect your wallet.");
                return null;
            }

            console.error("Decryption failed:", err);
            setError("Decryption failed: " + (err.message || "Unknown error"));
            return null;
        } finally {
            decryptInFlightRef.current = false;
        }
    }, [publicKey, signMessage]);

    const claimPrize = useCallback(async (marketPDA: PublicKey, isWinnerHandle: string, plaintext: string, ed25519Instructions: TransactionInstruction[]): Promise<string | null> => {
        if (!program || !publicKey || !signTransaction) return null;
        setLoading(true);
        try {
            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const [vaultPDA] = getVaultPDA(marketPDA);

            const claimIx = await (program.methods
                .claimPrize(handleToBuffer(isWinnerHandle), plaintextToBuffer(plaintext))
                .accounts({
                    winner: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    vault: vaultPDA,
                    instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
                    systemProgram: SystemProgram.programId,
                }) as any).instruction();

            const tx = new Transaction();
            ed25519Instructions.forEach((ix) => tx.add(ix));
            tx.add(claimIx);

            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;

            const signedTx = await signTransaction(tx);
            const sig = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction({ signature: sig, ...(await connection.getLatestBlockhash()) });
            return sig;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [program, publicKey, signTransaction, connection]);

    return {
        loading,
        error,
        fetchMarkets,
        fetchMarketByPDA,
        fetchBet,
        initializeMarket,
        submitBet,
        settleMarket,
        evaluateBet,
        decryptIsWinner,
        claimPrize,
    };
}
