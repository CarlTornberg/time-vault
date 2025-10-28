use anchor_lang::prelude::*;

declare_id!("D8zgbdfD5AMJdS58ckjMD9MzbwY7fMVnS7ycteq8CwzA");

mod errors;
mod states;
mod instructions;

#[program]
pub mod time_vault {
    use super::*;
    pub use errors::*;
    pub use states::*;
    pub use instructions::*;

    pub fn initialize(ctx: Context<Initialize>, withdraw_cooldown: u64) -> Result<()> {
        instructions::initialize_vault(ctx, withdraw_cooldown)
    }

    pub fn deposit(ctx: Context<Deposit>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        Ok(())
    }

    pub fn lock(ctx: Context<Lock>, locked: bool) -> Result<()> {
        instructions::set_locked(ctx, locked)
    }
}

