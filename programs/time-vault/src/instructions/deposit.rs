use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::{errors::VaultError, states::{VaultData, TOKEN_VAULT_SEED}};

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(!&ctx.accounts.vault_data.is_locked, VaultError::Locked);

    let cpi_accounts = token_interface::TransferChecked {
        from: ctx.accounts.from_ata.to_account_info(),
        to: ctx.accounts.token_vault.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token_interface::transfer_checked(
        cpi_context, 
        amount, 
        ctx.accounts.mint.decimals)
}

#[derive(Accounts)]
#[instruction(lamports: i64)]
pub struct Deposit<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
        owner = crate::ID, 
    )]
    vault_data: Account<'info, VaultData>,

    #[account(
        init_if_needed,
        payer = authority,
        token::mint = mint,
        token::authority = vault_data,
        seeds = [TOKEN_VAULT_SEED, mint.key().as_ref(), vault_data.key().as_ref()],
        bump,
    )]
    token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
        token::mint = mint,
    )]
    from_ata: InterfaceAccount<'info, TokenAccount>,

    mint: InterfaceAccount<'info, Mint>,

    token_program: Interface<'info, TokenInterface>,
    system_program: Program<'info, System>,
}
