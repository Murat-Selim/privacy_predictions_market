use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Market is closed")]
    MarketClosed,
    #[msg("Market is still open")]
    MarketStillOpen,
    #[msg("Final price not set")]
    NoFinalPrice,
    #[msg("Not bet owner")]
    NotOwner,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Bet not evaluated yet")]
    NotChecked,
    #[msg("Not the winner")]
    NotWinner,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("No funds in vault")]
    NoFunds,
    #[msg("Invalid asset symbol")]
    InvalidAssetSymbol,
}
