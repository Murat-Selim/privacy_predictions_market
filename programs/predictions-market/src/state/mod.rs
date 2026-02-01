use anchor_lang::prelude::*;

/// Market account
#[account]
pub struct Market {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub price_feed: Pubkey,            // Pyth price feed account
    pub asset_symbol: String,         // "BTC" or "SOL"
    pub start_timestamp: i64,
    pub end_timestamp: i64,
    pub is_settled: bool,
    pub final_price_handle: u128,     // Encrypted final price from oracle
    pub participant_count: u32,
    pub prize_claimed: bool,
    pub bump: u8,
}

impl Market {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + (4 + 10) + 8 + 8 + 1 + 16 + 4 + 1 + 1; // Added 32 for price_feed
}

/// Bet account
#[account]
pub struct Bet {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub min_handle: u128,             // Encrypted min price
    pub max_handle: u128,             // Encrypted max price
    pub amount_handle: u128,          // Encrypted bet amount
    pub is_winner_handle: u128,       // Encrypted boolean result
    pub claimed: bool,
    pub bump: u8,
}

impl Bet {
    pub const SIZE: usize = 8 + 32 + 32 + 16 + 16 + 16 + 16 + 1 + 1;
}
