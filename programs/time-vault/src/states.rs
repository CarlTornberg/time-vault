use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultData {
    pub owner: Pubkey,
    pub is_locked: bool,
    pub withdraw_cooldown: i64,
    pub recent_withdraw: i64,
    pub bump: u8,
}
