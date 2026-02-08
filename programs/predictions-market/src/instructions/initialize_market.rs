use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use crate::state::Market;
use crate::error::MarketError;

#[derive(Accounts)]
#[instruction(asset_symbol: String)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Market::SIZE,
        seeds = [b"market", authority.key().as_ref(), asset_symbol.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    /// CHECK: Vault is a PDA owned by the System Program; created and validated via seeds + bump.
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    /// CHECK: Pyth PriceUpdateV2 account (push feed); validated later via seeds and feed ID.
    pub price_feed: AccountInfo<'info>,
}

pub fn handle_initialize_market(ctx: Context<InitializeMarket>, asset_symbol: String, start_timestamp: i64) -> Result<()> {
    // Allow any asset symbol for testing purposes
    require!(asset_symbol.len() > 0 && asset_symbol.len() <= 10, MarketError::InvalidAssetSymbol);

    // Create the vault PDA as a system-owned account with 0 data.
    if ctx.accounts.vault.lamports() == 0 {
        let market_key = ctx.accounts.market.key();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            market_key.as_ref(),
            &[ctx.bumps.vault],
        ];
        let ix = system_instruction::create_account(
            ctx.accounts.authority.key,
            ctx.accounts.vault.key,
            0,
            0,
            &System::id(),
        );
        invoke_signed(
            &ix,
            &[
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[vault_seeds],
        )?;
    }

    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
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
