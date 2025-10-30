import * as anchor from "@coral-xyz/anchor";
import { Program} from "@coral-xyz/anchor";
import { TimeVault } from "../target/types/time_vault";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { should } from "chai";
import { createNewMint, getKeypairFromFile } from "../tests/utils/create-token-mint-solana/create-mint"
import { Account, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { min } from "bn.js";

describe("time-vault", () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const mintAuthority = getKeypairFromFile("/.config/solana/id.json");
  const program = anchor.workspace.timeVault as Program<TimeVault>;
  const conn = program.provider.connection;
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  let mint: Keypair;
  let mintVault: Account;
  console.log("Alice:", alice.publicKey, "\nPDA:", getVaultPDA(alice.publicKey));
  console.log("Bob:", bob.publicKey, "\nPDA:", getVaultPDA(bob.publicKey));
  
  it('Create new mint', async () => { 
    await airdrop(mintAuthority.publicKey, LAMPORTS_PER_SOL);
    mint = await createNewMint(conn, mintAuthority);
  });
  
  it('Mint to mint vault', async () => {
    const mintAmount: bigint = BigInt(1000000);
    // Create ATA before minting, or the account is not init'd and is a system program.
    mintVault = await getOrCreateAssociatedTokenAccount(conn, mintAuthority, mint.publicKey, mintAuthority.publicKey);
    await mintTo(
      conn,
      mintAuthority,
      mint.publicKey,
      mintVault.address,
      mintAuthority,
      mintAmount,
    );
    mintVault = await getOrCreateAssociatedTokenAccount(conn, mintAuthority, mint.publicKey, mintAuthority.publicKey);
    should().equal(mintVault.amount, mintAmount, "Failed to mint to vault"); 
  });

  it('Initialize alice vault', async () => {
    await airdrop(alice.publicKey, LAMPORTS_PER_SOL);
    await airdrop(bob.publicKey, LAMPORTS_PER_SOL);

    const tx = await program
      .methods
      .initialize(new anchor.BN(100))
      .accounts({signer: alice.publicKey})
      .signers([alice])
      .rpc({commitment: "confirmed"});  
    console.log(tx);
  });

  it('Lock and unlock alice vault', async () => {
    await program.methods
      .lock(true)
      .accounts({owner: alice.publicKey})
      .signers([alice])
      .rpc({commitment: "confirmed"});
    let vault = await program.account
      .vault
      .fetch(
        getVaultPDA(alice.publicKey)[0],
        "confirmed"
      );
    should().equal(vault.isLocked, true, "Vault is not locked");
    await program.methods
      .lock(false)
      .accounts({owner: alice.publicKey})
      .signers([alice])
      .rpc({commitment: "confirmed"});
    vault = await program.account
      .vault
      .fetch(
        getVaultPDA(alice.publicKey)[0],
        "confirmed"
      );
    should().equal(vault.isLocked, false, "Vault did not unlock.");
  });

  it('Bob should transfer to Alice', async () => {

    const bal = await conn.getBalance(getVaultPDA(alice.publicKey)[0], "confirmed");
    const transfer_amount: number = 100.000;

    await program.methods
    .deposit(new anchor.BN(transfer_amount))
    .accounts({
      from: bob.publicKey,
      to: getVaultPDA(alice.publicKey)[0],
    })
    .signers([bob])
    .rpc({commitment: "confirmed"});

    let bal_after = await conn.getBalance(getVaultPDA(alice.publicKey)[0], "confirmed");

    should().equal(bal_after, bal + transfer_amount, "Balance did not change.");

  });

  it('Should not be able to deposit to locked vault', async () => {
    const charlie = Keypair.generate();
    await airdrop(charlie.publicKey, LAMPORTS_PER_SOL);

    await program
      .methods
      .initialize(new anchor.BN(100))
      .accounts({signer: charlie.publicKey})
      .signers([charlie])
      .rpc({commitment: "confirmed"});  

    await program.methods
      .lock(true)
      .accounts({owner: charlie.publicKey})
      .signers([charlie])
      .rpc({commitment: "confirmed"});

    try {
      await program.methods
      .deposit(new anchor.BN(1000))
      .accounts({
        from: bob.publicKey, 
        to: getVaultPDA(charlie.publicKey)[0]})
      .signers([bob])
      .rpc({commitment: "confirmed"});
      
      should().fail("Should not be able to withdraw to locked vault.");
    }
    catch(e) {
      should().equal(e.error.errorCode.code, "Locked", "Incorrect error");
    }
  });

  it('Alice withdraws lamport from her Vault', async () => {

    const bal_before = await conn.getBalance(alice.publicKey, "confirmed");
    const transfer_amount: number = 100;

    await program.methods
    .withdraw(new anchor.BN(transfer_amount))
    .accounts({
      owner: alice.publicKey, 
    })
    .signers([alice])
    .rpc({commitment: "confirmed"});

    const bal_after = await conn.getBalance(alice.publicKey, "confirmed");

    should().equal(bal_before + transfer_amount, bal_after);

  });

  async function airdrop(to: PublicKey, amount: number) { 
    const blockhash = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature: await conn.requestAirdrop(to, amount),
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight
    }, "confirmed");
  };

  function getVaultPDA(of: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("vault"),
        of.toBuffer()
      ],
      program.programId
    )
  }
});
