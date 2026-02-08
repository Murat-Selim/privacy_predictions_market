use anchor_lang::prelude::*;
use inco_lightning::{
    cpi::{self, accounts::{Allow, Operation}},
    program::IncoLightning,
    types::{Ebool, Euint128},
    ID as INCO_LIGHTNING_ID,
};
use crate::state::{Market, Bet};
use crate::error::MarketError;

#[derive(Accounts)]
pub struct EvaluateBet<'info> {
    #[account(mut)]
    pub actor: Signer<'info>,

    pub market: Account<'info, Market>,

    #[account(mut)]
    pub bet: Account<'info, Bet>,

    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

pub fn handle_evaluate_bet<'info>(ctx: Context<'_, '_, '_, 'info, EvaluateBet<'info>>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &mut ctx.accounts.bet;

    require!(market.is_settled, MarketError::MarketStillOpen);

    let inco = ctx.accounts.inco_lightning_program.to_account_info();
    let actor = ctx.accounts.actor.to_account_info();

    // is_winner = (min <= final_price) AND (final_price <= max)
    
    // min <= final_price
    let le_price: Ebool = cpi::e_le(
        CpiContext::new(inco.clone(), Operation { signer: actor.clone() }),
        Euint128(bet.min_handle),
        Euint128(market.final_price_handle),
        0
    )?;

    // final_price <= max
    let price_le_max: Ebool = cpi::e_le(
        CpiContext::new(inco.clone(), Operation { signer: actor.clone() }),
        Euint128(market.final_price_handle),
        Euint128(bet.max_handle),
        0
    )?;

    // combine with AND
    let is_winner: Euint128 = cpi::e_and(
        CpiContext::new(inco.clone(), Operation { signer: actor.clone() }),
        Euint128(le_price.0),
        Euint128(price_le_max.0),
        0
    )?;

    bet.is_winner_handle = is_winner.0;
    msg!("Result handle: {}", is_winner.0);

    // Allow bet owner to decrypt the result
    if ctx.remaining_accounts.len() >= 2 {
        let cpi_ctx = CpiContext::new(inco, Allow {
            allowance_account: ctx.remaining_accounts[0].clone(),
            signer: ctx.accounts.actor.to_account_info(),
            allowed_address: ctx.remaining_accounts[1].clone(),
            system_program: ctx.accounts.system_program.to_account_info(),
        });

        cpi::allow(cpi_ctx, is_winner.0, true, bet.owner)?;
    }

    msg!("Bet evaluated!");
    Ok(())
}
