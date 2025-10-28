use anchor_lang::prelude::*;

use crate::states::Vault;

pub fn set_locked(ctx: Context<Lock>, locked: bool) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.is_locked = locked;
    msg!("{} {} {}'s vault {}", ctx.accounts.owner.key(), if locked {"locked"} else {"unlocked"}, vault.owner, vault.key());
    Ok(())
}

#[derive(Accounts)]
#[instruction(locked: bool)]
pub struct Lock<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner, // Checks the ownership of the vault 
        owner = crate::ID, // Checks the ownership of the account (Front-running)
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    vault: Account<'info, Vault>,
}
