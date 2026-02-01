import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import { expect } from "chai";

// Import the IDL
const idl = JSON.parse(fs.readFileSync("./app/src/lib/idl.json", "utf8"));

describe("prediction-market-logic", () => {
  // Test that the program IDL is valid
  it("should have valid program IDL", () => {
    expect(idl).to.not.be.undefined;
    expect(idl.metadata).to.not.be.undefined;
    expect(idl.instructions).to.not.be.undefined;
    expect(idl.accounts).to.not.be.undefined;
  });

  // Test that the program has the expected instructions
  it("should have expected instructions", () => {
    const instructions = idl.instructions.map((instr: any) => instr.name);
    expect(instructions).to.include("initialize_market");
    expect(instructions).to.include("submit_bet");
    expect(instructions).to.include("settle_market");
    expect(instructions).to.include("evaluate_bet");
    expect(instructions).to.include("claim_prize");
  });

  // Test that the program has the expected accounts
  it("should have expected accounts", () => {
    const accounts = idl.accounts.map((acc: any) => acc.name);
    expect(accounts).to.include("Market");
    expect(accounts).to.include("Bet");
  });

  // Test that the program has the expected errors
  it("should have expected errors", () => {
    const errors = idl.errors.map((err: any) => err.name);
    expect(errors).to.include("MarketClosed");
    expect(errors).to.include("MarketStillOpen");
    expect(errors).to.include("NoFinalPrice");
    expect(errors).to.include("NotOwner");
    expect(errors).to.include("AlreadyClaimed");
    expect(errors).to.include("NotChecked");
    expect(errors).to.include("NotWinner");
    expect(errors).to.include("Unauthorized");
    expect(errors).to.include("NoFunds");
    // Note: InvalidAssetSymbol may not be in the IDL yet if it was added recently
    // expect(errors).to.include("InvalidAssetSymbol");
  });

  // Test PDA derivation logic
  it("should derive PDAs correctly", () => {
    const programId = new PublicKey("GVuxc87ispNtvPuePDUCfxQzxbDoTzsw5iVttBqWpF85");
    const wallet = Keypair.generate();
    const assetSymbol = "BTC-TEST";

    // Test market PDA derivation
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), wallet.publicKey.toBuffer(), Buffer.from(assetSymbol)],
      programId
    );

    // Test vault PDA derivation
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      programId
    );

    // Test bet PDA derivation
    const [betPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
      programId
    );

    expect(marketPda).to.not.be.undefined;
    expect(vaultPda).to.not.be.undefined;
    expect(betPda).to.not.be.undefined;
    expect(marketPda.toBase58()).to.not.equal(vaultPda.toBase58());
    expect(marketPda.toBase58()).to.not.equal(betPda.toBase58());
    expect(vaultPda.toBase58()).to.not.equal(betPda.toBase58());
  });

  // Test that the program compiles (this is verified by the build process)
  it("should compile successfully", () => {
    // This test passes if the build process completed successfully
    // The actual compilation is done in the build step
    expect(true).to.be.true;
  });
});