use anchor_lang::prelude::*;

pub const TOKEN_VAULT_SEED: &[u8] = b"token_vault";
pub const VAULT_DATA_SEED: &[u8] = b"vault_data";

#[account]
#[derive(InitSpace)]
pub struct VaultData {
    pub authority: Pubkey,
    pub is_locked: bool,
    pub withdraw_cooldown: i64,
    pub recent_withdraw: i64,
    pub bump: u8,
}
