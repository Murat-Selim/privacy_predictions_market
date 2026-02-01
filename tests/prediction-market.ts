import anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddress,
  createSyncNativeInstruction
} from "@solana/spl-token";
import nacl from "tweetnacl";
import { encryptValue } from "@inco/solana-sdk/encryption";
import { decrypt } from "@inco/solana-sdk/attested-decrypt";
import { hexToBuffer } from "@inco/solana-sdk/utils";
import * as fs from "fs";
const idl = JSON.parse(fs.readFileSync("./app/src/lib/idl.json", "utf8"));

const INCO_LIGHTNING_PROGRAM_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");
const PRICE_FEED_BTC = new PublicKey("Hov6Q8D2yYv7LEmS6HnK1aym8M65v7Cg7eYGu2S12q94"); // Pyth BTC/USD Devnet

describe("prediction-market", () => {
  // Use local test environment for testing
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use the actual program ID from Anchor.toml
  const programId = new PublicKey("GVuxc87ispNtvPuePDUCfxQzxbDoTzsw5iVttBqWpF85");
  const program = new anchor.Program(idl as any, provider) as any;
  let wallet: Keypair;

  // Use a random symbol ensures we test a Fresh Market every time
  const ASSET_SYMBOL = `BTC-${Math.floor(Date.now())}`;
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);

  // Bet details
  const MIN_PRICE = 50000;
  const MAX_PRICE = 60000;
  // 0.0001 SOL = 100,000 lamports
  const BET_AMOUNT = 100_000;

  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let betPda: PublicKey;
  let buyerTokenAccount: PublicKey;

  before(async () => {
    wallet = (provider.wallet as any).payer as Keypair;

    // Create PDAs
    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), wallet.publicKey.toBuffer(), Buffer.from(ASSET_SYMBOL)],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
    [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );

    console.log("Using Asset Symbol:", ASSET_SYMBOL);
    console.log("Market PDA:", marketPda.toBase58());

    // 1. Ensure user has a WSOL account
    buyerTokenAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      wallet.publicKey
    );

    console.log("Buyer Token Account (WSOL):", buyerTokenAccount.toBase58());

    // 2. Wrap SOL for betting
    // We will wrap 0.01 SOL to be safe (10,000,000 lamports)
    // Wallet has ~0.45 SOL
    const wrapAmount = 10_000_000;

    try {
      const tx = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          buyerTokenAccount,
          wallet.publicKey,
          NATIVE_MINT
        ),
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: buyerTokenAccount,
          lamports: wrapAmount
        }),
        createSyncNativeInstruction(buyerTokenAccount)
      );

      const sig = await provider.sendAndConfirm(tx, []);
      console.log("Wrapped SOL for betting:", sig);
    } catch (err) {
      console.error("Error wrapping SOL:", err);
      throw err;
    }
  });

  it("1. Initialize Market", async () => {
    await program.methods
      .initializeMarket(ASSET_SYMBOL, new anchor.BN(START_TIMESTAMP))
      .accounts({
        authority: wallet.publicKey,
        mint: NATIVE_MINT,
        market: marketPda,
        vault: vaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        priceFeed: PRICE_FEED_BTC
      } as any)
      .rpc();
    console.log("Market initialized!");
  });

  it("2. Submit Bet", async () => {
    const encryptedMin = await encryptValue(BigInt(MIN_PRICE));
    const encryptedMax = await encryptValue(BigInt(MAX_PRICE));
    const encryptedAmount = await encryptValue(BigInt(BET_AMOUNT));

    const tx = await program.methods
      .submitBet(
        hexToBuffer(encryptedMin),
        hexToBuffer(encryptedMax),
        hexToBuffer(encryptedAmount),
        new anchor.BN(BET_AMOUNT)
      )
      .accounts({
        buyer: wallet.publicKey,
        market: marketPda,
        bet: betPda,
        vault: vaultPda,
        buyerTokenAccount: buyerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Bet submitted:", tx);
  });
});
