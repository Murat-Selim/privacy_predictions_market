use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use inco_lightning::{
    cpi::{self, accounts::VerifySignature},
    program::IncoLightning,
    ID as INCO_LIGHTNING_ID,
};
use crate::state::{Market, Bet};
use crate::error::MarketError;

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub bet: Account<'info, Bet>,

    #[account(
        mut, 
        seeds = [b"vault", market.key().as_ref()], 
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub winner_token_account: Account<'info, TokenAccount>,

    /// CHECK: Instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,

    #[account(address = INCO_LIGHTNING_ID)]
    pub inco_lightning_program: Program<'info, IncoLightning>,
}

pub fn handle_claim_prize(
    ctx: Context<ClaimPrize>,
    handle: Vec<u8>,
    plaintext: Vec<u8>,
) -> Result<()> {
    let bet = &mut ctx.accounts.bet;
    let market = &mut ctx.accounts.market;

    require!(bet.owner == ctx.accounts.winner.key(), MarketError::NotOwner);
    require!(bet.is_winner_handle != 0, MarketError::NotChecked);
    require!(!bet.claimed, MarketError::AlreadyClaimed);

    // Verify decryption signature
    let cpi_ctx = CpiContext::new(
        ctx.accounts.inco_lightning_program.to_account_info(),
        VerifySignature {
            instructions: ctx.accounts.instructions.to_account_info(),
            signer: ctx.accounts.winner.to_account_info(),
        },
    );

    cpi::is_validsignature(
        cpi_ctx,
        1,
        Some(vec![handle]),
        Some(vec![plaintext.clone()]),
    )?;

    let is_winner = parse_plaintext_to_bool(&plaintext)?;
    require!(is_winner, MarketError::NotWinner);

    bet.claimed = true;

    // For simplicity, we just payout some "prize" or the bet amount.
    // In a real app, you'd calculate payout based on pool.
    // Here we'll just transfer whatever is in the vault if it's the first winner, 
    // or a portion. To keep it simple like the raffle, first winner takes all or we can just msg.
    
    let prize = ctx.accounts.vault.amount;
    if prize > 0 {
        let market_key = market.key();
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            market_key.as_ref(),
            &[ctx.bumps.vault],
        ];
        let signer_seeds = &[vault_seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.winner_token_account.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, prize)?;

        msg!("Prize claimed: {} tokens", prize);
    }

    Ok(())
}

fn parse_plaintext_to_bool(plaintext: &[u8]) -> Result<bool> {
    if plaintext.is_empty() {
        return Ok(false);
    }
    let any_nonzero = plaintext.iter().any(|&b| b != 0 && b != b'0');
    Ok(any_nonzero)
}
