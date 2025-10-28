use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub is_locked: bool,
    pub withdraw_cooldown: u64,
    pub recent_withdraw: u64,
    pub bump: u8,
}
