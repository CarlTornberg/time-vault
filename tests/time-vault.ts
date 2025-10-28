import * as anchor from "@coral-xyz/anchor";
import { Program} from "@coral-xyz/anchor";
import { TimeVault } from "../target/types/time_vault";
import { Keypair, PublicKey, LAMPORTS_PER_SOL, Signer } from "@solana/web3.js";
import { should } from "chai";

describe("time-vault", () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.timeVault as Program<TimeVault>;
  const conn = program.provider.connection;
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  console.log("Alice:", alice.publicKey, "\nPDA:", getVaultPDA(alice.publicKey));
  console.log("Bob:", bob.publicKey, "\nPDA:", getVaultPDA(bob.publicKey));
  

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
