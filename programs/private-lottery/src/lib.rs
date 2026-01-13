#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("6fQ5w1YWBShrFZGepxt1tBSDtobJgXPsYGpG4GstmfzF");

#[program]
pub mod private_lottery {
    use super::*;

    pub fn create_lottery(ctx: Context<CreateLottery>, lottery_id: u64, ticket_price: u64) -> Result<()> {
        instructions::create_lottery::handler(ctx, lottery_id, ticket_price)
    }

    pub fn buy_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyTicket<'info>>,
        encrypted_guess: Vec<u8>,
    ) -> Result<()> {
        instructions::buy_ticket::handler(ctx, encrypted_guess)
    }

    /// Draw a random winning number (1-100) using on-chain randomness
    pub fn draw_winner<'info>(
        ctx: Context<'_, '_, '_, 'info, DrawWinner<'info>>,
    ) -> Result<()> {
        instructions::draw_winner::handler(ctx)
    }

    pub fn check_winner<'info>(ctx: Context<'_, '_, '_, 'info, CheckWinner<'info>>) -> Result<()> {
        instructions::check_winner::handler(ctx)
    }

    /// Withdraw prize by proving winner status (is_winner_handle decryption)
    pub fn withdraw_prize(
        ctx: Context<WithdrawPrize>,
        handle: Vec<u8>,
        plaintext: Vec<u8>,
    ) -> Result<()> {
        instructions::withdraw_prize::handler(ctx, handle, plaintext)
    }
}
