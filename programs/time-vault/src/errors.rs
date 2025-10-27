use anchor_lang::error_code;

#[error_code]
pub enum VaultError {
    #[msg("Vault is locked")]
    Locked,
    #[msg("Vault is still on cooldown")]
    Cooldown,
}
