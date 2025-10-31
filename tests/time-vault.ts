import * as anchor from "@coral-xyz/anchor";
import { Program} from "@coral-xyz/anchor";
import { TimeVault } from "../target/types/time_vault";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { should } from "chai";
import { createNewMint, getKeypairFromFile } from "../tests/utils/create-token-mint-solana/create-mint"
import { Account, getAccount, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
  console.log("Alice:", alice.publicKey.toBase58(), "\nPDA:", getVaultDataPDA(alice.publicKey)[0].toBase58());
  console.log("Bob:", bob.publicKey.toBase58(), "\nPDA:", getVaultDataPDA(bob.publicKey)[0].toBase58());
  
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

  it('Mint to bob', async () => {
    await airdrop(bob.publicKey, LAMPORTS_PER_SOL);

    const mintAmount: bigint = BigInt(1000000);
    // Create ATA before minting, or the account is not init'd and is a system program.
    mintVault = await getOrCreateAssociatedTokenAccount(conn, bob, mint.publicKey, bob.publicKey);
    await mintTo(
      conn,
      bob,
      mint.publicKey,
      mintVault.address,
      mintAuthority,
      mintAmount
    );
    mintVault = await getOrCreateAssociatedTokenAccount(conn, bob, mint.publicKey, bob.publicKey);
    should().equal(mintVault.amount, mintAmount, "Failed to mint to vault"); 
  });

  it('Initialize alice vault', async () => {
    await airdrop(alice.publicKey, LAMPORTS_PER_SOL);

    await program
      .methods
      .initialize(new anchor.BN(100))
      .accounts({signer: alice.publicKey})
      .signers([alice])
      .rpc({commitment: "confirmed"});  
  });

  it('Lock and unlock alice vault', async () => {
    await program.methods
      .lock(true)
      .accounts({authority: alice.publicKey})
      .signers([alice])
      .rpc({commitment: "confirmed"});
    let vault = await program.account
      .vaultData
      .fetch(
        getVaultDataPDA(alice.publicKey)[0],
        "confirmed"
      );
    should().equal(vault.isLocked, true, "Vault is not locked");
    await program.methods
      .lock(false)
      .accounts({authority: alice.publicKey})
      .signers([alice])
      .rpc({commitment: "confirmed"});
    vault = await program.account
      .vaultData
      .fetch(
        getVaultDataPDA(alice.publicKey)[0],
        "confirmed"
      );
    should().equal(vault.isLocked, false, "Vault did not unlock.");
  });

  it('Alice deposits to own vault', async () => {

    const mintAmount = BigInt(100);
    const transferAmount = BigInt(2);
    let aliceATA = await getOrCreateAssociatedTokenAccount(
      conn, 
      alice, 
      mint.publicKey, 
      alice.publicKey);

    await mintTo(
      conn, 
      alice, 
      mint.publicKey, 
      aliceATA.address, 
      mintAuthority, 
      mintAmount);

    aliceATA = await getOrCreateAssociatedTokenAccount(
      conn, 
      alice, 
      mint.publicKey, 
      alice.publicKey);

    should().equal(aliceATA.amount, mintAmount, "Failed to mint to Alice's ATA"); 

    const vaultDataPDA = getVaultDataPDA(alice.publicKey)[0];
    const tokenVaultPDA = getTokenVaultPDA(vaultDataPDA, mint.publicKey);

    await program.methods.lock(false).accounts({authority: alice.publicKey}).signers([alice]).rpc({commitment: "confirmed"});

    try{
      await program.methods
      .deposit(new anchor.BN(transferAmount))
      .accounts({
        authority: alice.publicKey,
        vaultData: vaultDataPDA,
        // tokenVault: getTokenVaultPDA(getVaultDataPDA(alice.publicKey)[0], mint.publicKey)[0],
        fromAta: aliceATA.address,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc({commitment: "confirmed"});

    }
    catch (e) {
      should().fail(e);
    }
    const tokenVault = await getAccount(conn, tokenVaultPDA[0]);

    should().equal(tokenVault.amount, transferAmount, "Tokens not transferred");
  });

  it('Should not be able to deposit to locked vault', async () => {

    const vaultDataPDA = getVaultDataPDA(alice.publicKey)[0];

    await program.methods.lock(true).accounts({authority: alice.publicKey}).signers([alice]).rpc({commitment: "confirmed"});

    try{
      await program.methods
      .deposit(new anchor.BN(1))
      .accounts({
        authority: alice.publicKey,
        vaultData: vaultDataPDA,
        // tokenVault: getTokenVaultPDA(getVaultDataPDA(alice.publicKey)[0], mint.publicKey)[0],
        fromAta: getAssociatedTokenAddressSync(mint.publicKey, alice.publicKey),
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([alice])
      .rpc({commitment: "confirmed"});

      should().fail();
    }
    catch (e) { }
  });

  it('Withdraw Alice tokens', async () => {
    
    const bal_before = (await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, alice.publicKey))).amount;
    const transferAmount = BigInt(1);

    await program.methods.lock(false).accounts({authority: alice.publicKey}).signers([alice]).rpc({commitment: "confirmed"});

    try {
      await program.methods
      .withdraw(new anchor.BN(transferAmount))
      .accountsPartial({
        authority: alice.publicKey,
        toAta: getAssociatedTokenAddressSync(mint.publicKey, alice.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
        mint: mint.publicKey,
      })
      .signers([alice])
    .rpc({commitment: "confirmed"});
    } catch (e) {
      should().fail(e);
    }
    
    const bal_after = (await getAccount(conn, getAssociatedTokenAddressSync(mint.publicKey, alice.publicKey))).amount;

    should().equal(bal_before + transferAmount, bal_after, "Balance not transferred.");

  });


  async function airdrop(to: PublicKey, amount: number) { 
    const blockhash = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature: await conn.requestAirdrop(to, amount),
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight
    }, "confirmed");
  };

  function getVaultDataPDA(of: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("vault_data"),
        of.toBuffer()
      ],
      program.programId
    )
  }
  
  function getTokenVaultPDA(vaultData: PublicKey, mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("token_vault"),
        mint.toBuffer(),
        vaultData.toBuffer()
      ],
      program.programId
    )
  }
});
