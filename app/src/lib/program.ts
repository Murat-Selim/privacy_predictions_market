import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";

// Program ID from the deployed contract
export const PROGRAM_ID = new PublicKey(
  "GVuxc87ispNtvPuePDUCfxQzxbDoTzsw5iVttBqWpF85"
);

// Inco Lightning Program ID
export const INCO_LIGHTNING_PROGRAM_ID = new PublicKey(
  "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
);

// IDL import
import idl from "./idl.json";

export type RangePredictionIDL = typeof idl;

export function getProgram(
  connection: Connection,
  wallet: AnchorProvider["wallet"]
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(idl as any, provider) as any;
}

// PDA derivation functions
export function getMarketPDA(
  authority: PublicKey,
  assetSymbol: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("market"),
      authority.toBuffer(),
      Buffer.from(assetSymbol),
    ],
    PROGRAM_ID
  );
}

export function getBetPDA(
  market: PublicKey,
  owner: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), market.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function getVaultPDA(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), market.toBuffer()],
    PROGRAM_ID
  );
}

// Convert u128 handle to Buffer
export function handleToBuffer(handle: BN | bigint | string): Buffer {
  const bn =
    typeof handle === "bigint"
      ? new BN(handle.toString())
      : typeof handle === "string"
        ? new BN(handle)
        : handle;
  return bn.toArrayLike(Buffer, "le", 16);
}

export function plaintextToBuffer(plaintext: string): Buffer {
  // If it's a number-like string, convert to u128
  if (/^\d+$/.test(plaintext)) {
    return new BN(plaintext).toArrayLike(Buffer, "le", 16);
  }
  return Buffer.from(plaintext);
}

// Market account type
export interface MarketAccount {
  authority: PublicKey;
  mint: PublicKey;
  assetSymbol: string;
  startTimestamp: BN;
  endTimestamp: BN;
  isSettled: boolean;
  finalPriceHandle: BN;
  participantCount: number;
  prizeClaimed: boolean;
  bump: number;
}

// Bet account type
export interface BetAccount {
  market: PublicKey;
  owner: PublicKey;
  minHandle: BN;
  maxHandle: BN;
  amountHandle: BN;
  isWinnerHandle: BN;
  claimed: boolean;
  bump: number;
}

export { SystemProgram };
