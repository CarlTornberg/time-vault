use anchor_lang::prelude::*;

declare_id!("D8zgbdfD5AMJdS58ckjMD9MzbwY7fMVnS7ycteq8CwzA");

#[program]
pub mod time_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
