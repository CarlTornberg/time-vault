use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::{errors::VaultError, states::Vault};

pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
    let vault = &mut ctx.accounts.to;
    let from = &ctx.accounts.from;
    if vault.is_locked { return err!(VaultError::Locked); }

    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_accounts = Transfer{
        from: from.to_account_info(),
        to: vault.to_account_info()
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer(cpi_ctx, lamports)
}

#[derive(Accounts)]
#[instruction(lamports: i64)]
pub struct Deposit<'info> {
    #[account(mut)]
    from: Signer<'info>,

    #[account(
        mut,
        owner = crate::ID, // Checks the ownership of the account (Front-running)
    )]
    to: Account<'info, Vault>,

    system_program: Program<'info, System>,
}
