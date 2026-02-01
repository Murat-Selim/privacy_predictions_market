use anchor_lang::prelude::*;
use pyth_sdk_solana::load_price_feed_from_account_info;
use inco_lightning::{
    cpi::{self, accounts::Operation},
    program::IncoLightning,
    types::Euint128,
    ID as INCO_LIGHTNING_ID,
};
use crate::state::Market;
use crate::error::MarketError;

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
        has_one = price_feed,
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Validated via has_one in market account
    pub price_feed: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

pub fn handle_settle_market<'info>(
    ctx: Context<'_, '_, '_, 'info, SettleMarket<'info>>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    
    let clock = Clock::get()?;
    require!(clock.unix_timestamp >= market.end_timestamp, MarketError::MarketStillOpen);
    require!(!market.is_settled, MarketError::AlreadyClaimed);

    // Get price from Pyth
    let price_feed = load_price_feed_from_account_info(&ctx.accounts.price_feed).map_err(|_| MarketError::Unauthorized)?;
    let current_price = price_feed.get_price_no_older_than(clock.unix_timestamp, 60).ok_or(MarketError::NoFinalPrice)?;
    
    // Convert to u64 with safe scaling if necessary, for simplicity we assume price is within bounds
    // Pyth prices are (price * 10^expo)
    // We'll normalize to a fixed scale or just use the raw value if we expect consistent expo
    let final_price = current_price.price as u64; 

    let inco = ctx.accounts.inco_lightning_program.to_account_info();
    let signer = ctx.accounts.authority.to_account_info();

    // Store final price as an encrypted handle (so we can compare with encrypted ranges)
    let cpi_ctx = CpiContext::new(inco, Operation { signer });
    let price_handle: Euint128 = cpi::as_euint128(cpi_ctx, final_price as u128)?;

    market.final_price_handle = price_handle.0;
    market.is_settled = true;

    msg!("Market settled with price: {}", final_price);
    Ok(())
}
