use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token_interface::{self, Mint, TokenAccount, TokenInterface}};

use crate::{errors::VaultError, states::{VaultData, TOKEN_VAULT_SEED, VAULT_DATA_SEED}};

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault_data = &mut ctx.accounts.vault_data;

    require!(!vault_data.is_locked, VaultError::Locked);

    let time = Clock::get()?;
    require_gt!(
        time.unix_timestamp, 
        vault_data.recent_withdraw + vault_data.withdraw_cooldown, 
        VaultError::Cooldown);

    // Update withdraw timestamp
    vault_data.recent_withdraw = time.unix_timestamp;

    // Transfer
    // Seeds for CPI account's (token_vault) 'authority' (vault_data)
    // Authority is 'vault_data', which 'authority' has authority over.
    let signers_seeds: &[&[&[u8]]] = &[&[
        VAULT_DATA_SEED, 
        &ctx.accounts.authority.key().to_bytes(), 
        &[ctx.bumps.vault_data]
    ]];
    let decimals = ctx.accounts.mint.decimals;

    let cpi_accounts = token_interface::TransferChecked {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.token_vault.to_account_info(),
        to: ctx.accounts.to_ata.to_account_info(),
        authority: ctx.accounts.vault_data.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts)
        .with_signer(signers_seeds);
    token_interface::transfer_checked(cpi_context, amount, decimals)?;

    Ok(())

}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
        owner = crate::ID,
        seeds = [VAULT_DATA_SEED, authority.key().as_ref()],
        bump,
    )]
    vault_data: Account<'info, VaultData>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = vault_data,
        seeds = [TOKEN_VAULT_SEED, mint.key().as_ref(), vault_data.key().as_ref()],
        bump,
    )]
    token_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
        token::mint = mint,
        token::authority = authority,
    )]
    to_ata: InterfaceAccount<'info, TokenAccount>,

    mint: InterfaceAccount<'info, Mint>,

    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
    associated_token_program: Program<'info, AssociatedToken>,
}
