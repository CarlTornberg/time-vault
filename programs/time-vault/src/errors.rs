use anchor_lang::error_code;

#[error_code]
pub enum VaultError {
    #[msg("Vault is locked")]
    Locked,
    #[msg("Vault is still on cooldown")]
    Cooldown,
    #[msg("Must be 0 <= x <= i64::MAX")]
    InvalidCooldown,
    #[msg("Incorrect vault address")]
    IncorrrectVaultAddress,
    #[msg("The vault used and the owner provided does not match")]
    IncorrectVault,
}
