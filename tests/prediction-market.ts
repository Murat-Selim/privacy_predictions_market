import anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
const PUSH_ORACLE_PROGRAM_ID = new PublicKey(
  "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT"
);

function getPriceFeedAccountAddress(shardId: number, feedId: string): PublicKey {
  const hex = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
  const feedIdBytes = Buffer.from(hex, "hex");
  if (feedIdBytes.length !== 32) {
    throw new Error("Feed ID should be 32 bytes long");
  }
  const shardBuffer = Buffer.alloc(2);
  shardBuffer.writeUInt16LE(shardId, 0);
  return PublicKey.findProgramAddressSync(
    [shardBuffer, feedIdBytes],
    PUSH_ORACLE_PROGRAM_ID
  )[0];
}
import { encryptValue } from "@inco/solana-sdk/encryption";
import { hexToBuffer } from "@inco/solana-sdk/utils";
import * as fs from "fs";
const idl = JSON.parse(fs.readFileSync("./app/src/lib/idl.json", "utf8"));

const BTC_USD_FEED_ID =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

describe("prediction-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as any, provider);

  let wallet: Keypair;

  const ASSET_SYMBOL = `BTC${Date.now() % 100000}`;  // Keep under 10 chars
  const START_TIMESTAMP = Math.floor(Date.now() / 1000);

  const MIN_PRICE = 50000;
  const MAX_PRICE = 60000;
  // 0.0001 SOL = 100,000 lamports
  const BET_AMOUNT = 100_000;

  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let betPda: PublicKey;
  let priceFeedBtc: PublicKey;
  before(async () => {
    wallet = (provider.wallet as any).payer as Keypair;
    const minBalance = 2 * anchor.web3.LAMPORTS_PER_SOL;
    const currentBalance = await provider.connection.getBalance(wallet.publicKey);
    if (currentBalance < minBalance) {
      const sig = await provider.connection.requestAirdrop(
        wallet.publicKey,
        minBalance - currentBalance
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
      console.log("Airdropped SOL for tests:", sig);
    }

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

    priceFeedBtc = getPriceFeedAccountAddress(0, BTC_USD_FEED_ID);
    console.log("BTC/USD Price Feed (Pyth Push):", priceFeedBtc.toBase58());

    console.log("Using native SOL transfers (no WSOL wrapping).");
  });

  it("1. Initialize Market", async () => {
    await program.methods
      .initializeMarket(ASSET_SYMBOL, new anchor.BN(START_TIMESTAMP))
      .accounts({
        authority: wallet.publicKey,
        market: marketPda,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
        priceFeed: priceFeedBtc
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
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("Bet submitted:", tx);
  });
});
