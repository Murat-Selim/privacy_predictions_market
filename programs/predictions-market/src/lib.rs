#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("7gp1d94Y7VtTd7rUEExAYhMuBJhVksAW72bY61FoUtfC");

#[program]
pub mod range_prediction_market {
    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket>, asset_symbol: String, start_timestamp: i64) -> Result<()> {
        instructions::initialize_market::handle_initialize_market(ctx, asset_symbol, start_timestamp)
    }

    pub fn submit_bet<'info>(
        ctx: Context<'_, '_, '_, 'info, SubmitBet<'info>>,
        encrypted_min: Vec<u8>,
        encrypted_max: Vec<u8>,
        encrypted_amount: Vec<u8>,
        amount: u64,
    ) -> Result<()> {
        instructions::submit_bet::handle_submit_bet(ctx, encrypted_min, encrypted_max, encrypted_amount, amount)
    }

    pub fn settle_market<'info>(
        ctx: Context<'_, '_, '_, 'info, SettleMarket<'info>>,
    ) -> Result<()> {
        instructions::settle_market::handle_settle_market(ctx)
    }

    pub fn evaluate_bet<'info>(ctx: Context<'_, '_, '_, 'info, EvaluateBet<'info>>) -> Result<()> {
        instructions::evaluate_bet::handle_evaluate_bet(ctx)
    }

    pub fn claim_prize(
        ctx: Context<ClaimPrize>,
        handle: Vec<u8>,
        plaintext: Vec<u8>,
    ) -> Result<()> {
        instructions::claim_prize::handle_claim_prize(ctx, handle, plaintext)
    }
}
