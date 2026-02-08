use anchor_lang::prelude::*;
use inco_lightning::{
    cpi::{self, accounts::Operation},
    program::IncoLightning,
    types::Euint128,
    ID as INCO_LIGHTNING_ID,
};
use pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2};
use crate::state::Market;
use crate::constants::{BTC_USD_FEED_ID, SOL_USD_FEED_ID};
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

    pub price_feed: Account<'info, PriceUpdateV2>,

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

    // Get price from Pyth push feed (PriceUpdateV2)
    let feed_id = if market.asset_symbol.starts_with("BTC") {
        get_feed_id_from_hex(BTC_USD_FEED_ID).map_err(|_| MarketError::InvalidAssetSymbol)?
    } else if market.asset_symbol.starts_with("SOL") {
        get_feed_id_from_hex(SOL_USD_FEED_ID).map_err(|_| MarketError::InvalidAssetSymbol)?
    } else {
        return err!(MarketError::InvalidAssetSymbol);
    };

    let current_price = ctx
        .accounts
        .price_feed
        .get_price_no_older_than(&clock, 60, &feed_id)
        .map_err(|_| MarketError::NoFinalPrice)?;

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
