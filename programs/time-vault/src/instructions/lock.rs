use anchor_lang::prelude::*;

use crate::states::{VaultData, VAULT_DATA_SEED};

pub fn set_locked(ctx: Context<Lock>, locked: bool) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.is_locked = locked;
    msg!("{} {} {}'s vault {}", ctx.accounts.authority.key(), if locked {"locked"} else {"unlocked"}, vault.authority, vault.key());
    Ok(())
}

#[derive(Accounts)]
#[instruction(locked: bool)]
pub struct Lock<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority, // Checks the ownership of the vault 
        owner = crate::ID, // Checks the ownership of the account (Front-running)
        seeds = [VAULT_DATA_SEED, authority.key().as_ref()],
        bump,
    )]
    vault: Account<'info, VaultData>,
}
