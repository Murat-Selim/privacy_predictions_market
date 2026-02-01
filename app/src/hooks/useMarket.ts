"use client";

import React, { useCallback, useState, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
    PublicKey,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    TransactionInstruction,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
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
    initializeMarket: (assetSymbol: string, startTimestamp: number, mint: PublicKey, price_feed: PublicKey) => Promise<string | null>;
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

    const initializeMarket = useCallback(async (assetSymbol: string, startTimestamp: number, mint: PublicKey, price_feed: PublicKey): Promise<string | null> => {
        if (!program || !publicKey) return null;
        setLoading(true);
        try {
            const [marketPDA] = getMarketPDA(publicKey, assetSymbol);
            const [vaultPDA] = getVaultPDA(marketPDA);
            const tx = await program.methods
                .initializeMarket(assetSymbol, new BN(startTimestamp))
                .accounts({
                    authority: publicKey,
                    mint: mint,
                    market: marketPDA,
                    vault: vaultPDA,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                    rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
                    priceFeed: price_feed,
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

    const submitBet = useCallback(async (marketPDA: PublicKey, encryptedMin: Buffer, encryptedMax: Buffer, encryptedAmount: Buffer, amount: number): Promise<string | null> => {
        if (!program || !publicKey) return null;
        setLoading(true);
        try {
            const marketAcc = await program.account.market.fetch(marketPDA);
            const mint = (marketAcc as any).mint;

            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const [vaultPDA] = getVaultPDA(marketPDA);
            const buyerTokenAccount = getAssociatedTokenAddressSync(mint, publicKey);

            const tx = await program.methods
                .submitBet(encryptedMin, encryptedMax, encryptedAmount, new BN(amount))
                .accounts({
                    buyer: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    vault: vaultPDA,
                    buyerTokenAccount: buyerTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
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
        try {
            const marketAcc = await program.account.market.fetch(marketPDA);
            const priceFeed = (marketAcc as any).priceFeed;

            const tx = await program.methods
                .settleMarket()
                .accounts({
                    authority: publicKey,
                    market: marketPDA,
                    priceFeed: priceFeed,
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

    const getEvaluateHandle = useCallback(async (marketPDA: PublicKey): Promise<bigint | null> => {
        if (!program || !publicKey) return null;
        try {
            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const ix = await (program.methods
                .evaluateBet()
                .accounts({
                    actor: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    systemProgram: SystemProgram.programId,
                }) as any).instruction();

            const { blockhash } = await connection.getLatestBlockhash();
            const messageV0 = new TransactionMessage({
                payerKey: publicKey,
                recentBlockhash: blockhash,
                instructions: [ix],
            }).compileToV0Message();
            const versionedTx = new VersionedTransaction(messageV0);
            const sim = await connection.simulateTransaction(versionedTx, { sigVerify: false });

            for (const log of sim.value.logs || []) {
                if (log.includes("Result handle:")) {
                    const match = log.match(/(\d+)/);
                    if (match) return BigInt(match[1]);
                }
            }
            return null;
        } catch (err) {
            return null;
        }
    }, [program, publicKey, connection]);

    const evaluateBet = useCallback(async (marketPDA: PublicKey): Promise<{ tx: string; isWinnerHandle: bigint } | null> => {
        if (!program || !publicKey) return null;
        setLoading(true);
        try {
            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const resultHandle = await getEvaluateHandle(marketPDA);
            if (!resultHandle) throw new Error("Could not get result handle");

            const [allowancePda] = deriveAllowancePda(resultHandle, publicKey);

            const tx = await program.methods
                .evaluateBet()
                .accounts({
                    actor: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    systemProgram: SystemProgram.programId,
                })
                .remainingAccounts([
                    { pubkey: allowancePda, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: false, isWritable: false },
                ])
                .rpc();

            return { tx, isWinnerHandle: resultHandle };
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [program, publicKey, getEvaluateHandle]);

    const decryptIsWinner = useCallback(async (handle: bigint): Promise<{ isWinner: boolean; plaintext: string; ed25519Instructions: TransactionInstruction[] } | null> => {
        if (!publicKey || !signMessage) return null;
        try {
            const result = await decrypt([handle.toString()], {
                address: publicKey,
                signMessage: signMessage as any,
            });
            const isWinner = result.plaintexts[0] === "1";
            return {
                isWinner,
                plaintext: result.plaintexts[0] as string,
                ed25519Instructions: (result.ed25519Instructions as unknown) as TransactionInstruction[]
            };
        } catch (err) {
            return null;
        }
    }, [publicKey, signMessage]);

    const claimPrize = useCallback(async (marketPDA: PublicKey, isWinnerHandle: string, plaintext: string, ed25519Instructions: TransactionInstruction[]): Promise<string | null> => {
        if (!program || !publicKey || !signTransaction) return null;
        setLoading(true);
        try {
            const marketAcc = await program.account.market.fetch(marketPDA);
            const mint = (marketAcc as any).mint;

            const [betPDA] = getBetPDA(marketPDA, publicKey);
            const [vaultPDA] = getVaultPDA(marketPDA);
            const winnerTokenAccount = getAssociatedTokenAddressSync(mint, publicKey);

            const claimIx = await (program.methods
                .claimPrize(handleToBuffer(isWinnerHandle), plaintextToBuffer(plaintext))
                .accounts({
                    winner: publicKey,
                    market: marketPDA,
                    bet: betPDA,
                    vault: vaultPDA,
                    winnerTokenAccount: winnerTokenAccount,
                    instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
                    tokenProgram: TOKEN_PROGRAM_ID,
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
