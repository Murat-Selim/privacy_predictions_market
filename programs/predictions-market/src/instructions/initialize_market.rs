use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::Market;
use crate::error::MarketError;

#[derive(Accounts)]
#[instruction(asset_symbol: String)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = Market::SIZE,
        seeds = [b"market", authority.key().as_ref(), asset_symbol.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = vault,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: Pyth price feed
    pub price_feed: AccountInfo<'info>,
}

pub fn handle_initialize_market(ctx: Context<InitializeMarket>, asset_symbol: String, start_timestamp: i64) -> Result<()> {
    // Allow any asset symbol for testing purposes
    require!(asset_symbol.len() > 0 && asset_symbol.len() <= 10, MarketError::InvalidAssetSymbol);

    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.mint = ctx.accounts.mint.key();
    market.price_feed = ctx.accounts.price_feed.key();
    market.asset_symbol = asset_symbol;
    market.start_timestamp = start_timestamp;
    market.end_timestamp = start_timestamp + 3600;
    market.is_settled = false;
    market.participant_count = 0;
    market.prize_claimed = false;
    market.bump = ctx.bumps.market;

    msg!("Market initialized for asset: {}", market.asset_symbol);
    msg!("Expires at: {}", market.end_timestamp);
    Ok(())
}
