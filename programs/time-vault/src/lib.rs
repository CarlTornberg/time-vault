#![allow(unexpected_cfgs, deprecated)]
use anchor_lang::prelude::*;

declare_id!("8drWJPiyFu9CtzbH3p1oK4iQG5HKGR6Cx3ReKDoPSThh");

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

