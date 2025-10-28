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

  async function airdrop(to: PublicKey, amount: number) { 
    const blockhash = await conn.getLatestBlockhash();
    await conn.confirmTransaction({
      signature: await conn.requestAirdrop(to, amount),
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight
    }, "confirmed");
  }
});
