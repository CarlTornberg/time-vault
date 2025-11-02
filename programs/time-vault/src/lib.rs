#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

declare_id!("GF2o6eTjo3uACFEshLKqQ9CwuB5x5tCfjzvRhCy1rCpa");

mod errors;
mod states;
mod instructions;

#[program]
pub mod time_vault {
    use super::*;
    pub use errors::*;
    pub use states::*;
    pub use instructions::*;

    pub fn initialize(ctx: Context<Initialize>, withdraw_cooldown: i64) -> Result<()> {
        instructions::initialize_vault(ctx, withdraw_cooldown)
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        instructions::deposit(ctx, lamports)
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        instructions::withdraw(ctx, lamports)
    }

    pub fn lock(ctx: Context<Lock>, locked: bool) -> Result<()> {
        instructions::set_locked(ctx, locked)
    }
}

