use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use inco_lightning::{
    cpi::{self, accounts::Operation},
    program::IncoLightning,
    types::Euint128,
    ID as INCO_LIGHTNING_ID,
};
use crate::state::{Market, Bet};
use crate::error::MarketError;

#[derive(Accounts)]
pub struct SubmitBet<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = buyer,
        space = Bet::SIZE,
        seeds = [b"bet", market.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        mut, 
        seeds = [b"vault", market.key().as_ref()], 
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

pub fn handle_submit_bet<'info>(
    ctx: Context<'_, '_, '_, 'info, SubmitBet<'info>>,
    encrypted_min: Vec<u8>,
    encrypted_max: Vec<u8>,
    encrypted_amount: Vec<u8>,
    amount: u64, // Plaintext amount for the actual transfer
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;
    require!(clock.unix_timestamp < market.end_timestamp, MarketError::MarketClosed);

    let inco = ctx.accounts.inco_lightning_program.to_account_info();
    
    // Create handles for min, max, and amount
    let min_handle: Euint128 = cpi::new_euint128(
        CpiContext::new(inco.clone(), Operation { signer: ctx.accounts.buyer.to_account_info() }),
        encrypted_min,
        0
    )?;
    
    let max_handle: Euint128 = cpi::new_euint128(
        CpiContext::new(inco.clone(), Operation { signer: ctx.accounts.buyer.to_account_info() }),
        encrypted_max,
        0
    )?;

    let amount_handle: Euint128 = cpi::new_euint128(
        CpiContext::new(inco.clone(), Operation { signer: ctx.accounts.buyer.to_account_info() }),
        encrypted_amount,
        0
    )?;

    // Store bet
    let bet = &mut ctx.accounts.bet;
    bet.market = market.key();
    bet.owner = ctx.accounts.buyer.key();
    bet.min_handle = min_handle.0;
    bet.max_handle = max_handle.0;
    bet.amount_handle = amount_handle.0;
    bet.bump = ctx.bumps.bet;

    // Transfer USDC to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    market.participant_count += 1;

    msg!("Bet submitted with {} tokens!", amount);
    Ok(())
}
