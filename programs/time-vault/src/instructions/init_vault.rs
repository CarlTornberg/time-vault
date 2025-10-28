use anchor_lang::prelude::*;

use crate::states::Vault;

pub fn initialize_vault(ctx: Context<Initialize>, withdraw_cooldown: u64) -> Result<()>{
    let vault = &mut ctx.accounts.vault;
    vault.owner = ctx.accounts.signer.key();
    vault.is_locked = true;
    vault.recent_withdraw = 0;
    vault.withdraw_cooldown = withdraw_cooldown;
    msg!("Created vault {} with withdraw cooldown {}", vault.key(), vault.withdraw_cooldown);
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
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", signer.key().as_ref()],
        bump,
    )]
    vault: Account<'info, Vault>,

    system_program: Program<'info, System>,
}
