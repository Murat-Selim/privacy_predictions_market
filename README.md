# Privacy Predictions Market

A confidential prediction market platform built on Solana using Inco Lightning rust SDK for encrypted compute on Solana. Users can make encrypted predictions on asset prices, and outcomes are determined through encrypted comparison, ensuring complete privacy throughout the market lifecycle.

## Overview

This program implements a prediction market where:

- User predictions are encrypted and hidden from everyone
- Asset prices are encrypted and hidden from everyone
- Outcome determination happens through encrypted comparison
- Only prediction owners can decrypt their results and winnings

## Architecture

### Privacy Model

| Data | Visibility |
|------|------------|
| User's prediction | Encrypted (only user can decrypt) |
| Asset price | Encrypted (set by oracle/authority) |
| Win/loss result | Encrypted (only prediction owner can decrypt) |
| Winnings amount | Encrypted (only prediction owner can decrypt) |

### Program Flow

```
1. initialize_market -> Authority creates market with asset, time range, and fee
2. submit_bet        -> User submits encrypted prediction (price range)
3. evaluate_bet      -> Authority sets encrypted asset price
4. settle_market     -> Encrypted comparison: prediction == asset_price
5. claim_prize       -> e_select(is_winner, prize_pool, 0) computes encrypted winnings
```

### Key Encrypted Operations

- `new_euint128`: Create encrypted value from ciphertext
- `e_eq`: Encrypted equality comparison
- `e_select`: Encrypted conditional selection
- `allow`: Grant decryption permission to specific address
- `is_validsignature`: Verify decryption proof on-chain

## Account Structures

### Market

```rust
pub struct Market {
    pub authority: Pubkey,
    pub market_id: u64,
    pub asset: String,              // Asset being predicted (e.g., "BTC/USD")
    pub entry_fee: u64,
    pub participant_count: u32,
    pub is_open: bool,
    pub settled: bool,              // True when market has been settled
    pub asset_price_handle: u128,   // Encrypted asset price
    pub bump: u8,
}
```

### Bet

```rust
pub struct Bet {
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub prediction_handle: u128,    // Encrypted prediction (price range)
    pub is_winner_handle: u128,     // Encrypted: prediction == asset_price?
    pub claimed: bool,              // Whether this bettor has claimed winnings
    pub bump: u8,
}
```

## Prerequisites

- Rust 1.70+
- Solana CLI 1.18+
- Anchor 0.31.1
- Node.js 18+
- Yarn

## Installation

```bash
# Clone repository
git clone https://github.com/Murat-Selim/privacy_predictions_market.git
cd privacy_predictions_market

# Install dependencies
yarn install

# Build program
anchor build
```

## Deployment

```bash
# Get program keypair address
solana address -k target/deploy/keypair.json

# Update program ID in lib.rs and Anchor.toml with the address above

# Rebuild with correct program ID
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Testing

```bash
# Run tests (after deployment)
anchor test --skip-deploy
```

### Test Scenarios

The test suite covers two scenarios:

1. **Winner Flow**: User predicts correctly and claims winnings
2. **Non-Winner Flow**: User predicts incorrectly and cannot claim

## Usage

### Client Integration

```typescript
import { encryptValue } from "@inco/solana-sdk/encryption";
import { decrypt } from "@inco/solana-sdk/attested-decrypt";
import { hexToBuffer } from "@inco/solana-sdk/utils";

// Encrypt prediction
const myPrediction = 50000; // Predicting BTC/USD at $50,000
const encryptedPrediction = await encryptValue(BigInt(myPrediction));

// Submit bet
await program.methods
  .submitBet(hexToBuffer(encryptedPrediction))
  .accounts({...})
  .rpc();

// Decrypt result after market settlement
const result = await decrypt([resultHandle], {
  address: wallet.publicKey,
  signMessage: async (msg) => nacl.sign.detached(msg, wallet.secretKey),
});

const isWinner = result.plaintexts[0] === "1";
```

### Allow Pattern for Decryption

To decrypt encrypted values, the program must grant permission via the `allow` instruction. This is done through remaining accounts:

```typescript
const [allowancePda] = PublicKey.findProgramAddressSync(
  [handleBuffer, walletPublicKey.toBuffer()],
  INCO_LIGHTNING_PROGRAM_ID
);

await program.methods
  .settleMarket()
  .accounts({...})
  .remainingAccounts([
    { pubkey: allowancePda, isSigner: false, isWritable: true },
    { pubkey: wallet.publicKey, isSigner: false, isWritable: false },
  ])
  .rpc();
```

### On-Chain Verification

Winnings withdrawal requires on-chain verification of the decryption proof:

```typescript
const result = await decrypt([winningsHandle], {...});

// Build transaction with Ed25519 signature + claim instruction
const tx = new Transaction();
result.ed25519Instructions.forEach(ix => tx.add(ix));
tx.add(claimInstruction);
```

## Dependencies

### Rust

```toml
[dependencies]
anchor-lang = "0.31.1"
inco-lightning = { version = "0.1.4", features = ["cpi"] }
```

## Setting up Frontend:

Navigate to the app folder:

```bash
cd app
```
Install the dependencies:
```bash
bun install
```

Start the app:

```bash
bun run dev
```

The app will start on localhost:3000





