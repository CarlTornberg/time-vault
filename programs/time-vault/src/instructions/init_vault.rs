use anchor_lang::prelude::*;

use crate::{errors::VaultError, states::{self, VaultData, VAULT_DATA_SEED}};

pub fn initialize_vault(ctx: Context<Initialize>, withdraw_cooldown: i64) -> Result<()>{
    require_gte!(withdraw_cooldown, 0, VaultError::InvalidCooldown);
    
    let vault_data = &mut ctx.accounts.vault_data;
    vault_data.authority = ctx.accounts.signer.key();
    vault_data.is_locked = true;
    vault_data.withdraw_cooldown = withdraw_cooldown;
    vault_data.recent_withdraw = 0;
    vault_data.bump = ctx.bumps.vault_data;
    
    msg!("Created vault {} with owner {} and withdraw cooldown {}", vault_data.key(), vault_data.authority, vault_data.withdraw_cooldown);
    Ok(())
}

#[derive(Accounts)]
#[instruction(delay: u64)]
pub struct Initialize<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + VaultData::INIT_SPACE,
        seeds = [VAULT_DATA_SEED, signer.key().as_ref()],
        bump,
    )]
    vault_data: Account<'info, VaultData>,

    system_program: Program<'info, System>,
}
