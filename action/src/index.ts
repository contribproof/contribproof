import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";

// -----------------------------------------------------------------------
// STATUS: untested scaffold. This has never been run against a real
// program or a real merge event. Do not wire this into a live repo's CI
// until `program/` mints successfully on devnet AND you've generated a
// real IDL from it — the `loadIdl()` function below is a stand-in.
// -----------------------------------------------------------------------

interface WalletMap {
  [githubUsername: string]: string; // Solana pubkey as base58 string
}

function loadWalletMap(repoRoot: string, relPath: string): WalletMap {
  const fullPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Wallet map not found at ${relPath}. Contributors must add their ` +
        `GitHub username → Solana wallet mapping there before a credential ` +
        `can be issued. See the repo README for the expected format.`
    );
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  return JSON.parse(raw) as WalletMap;
}

function loadIssuerKeypair(secret: string): Keypair {
  // Accepts either a JSON array secret key or a base58 string, since
  // different secret-storage conventions produce different formats.
  try {
    const asArray = JSON.parse(secret);
    return Keypair.fromSecretKey(Uint8Array.from(asArray));
  } catch {
    // TODO: add base58 decoding path if the secret isn't a JSON array.
    // Left unimplemented in this scaffold — decide on one canonical format
    // for the ISSUER_AUTHORITY_KEYPAIR secret before this goes live, and
    // remove the other branch to avoid ambiguity.
    throw new Error(
      "Could not parse issuer authority keypair. Expected a JSON array secret key."
    );
  }
}

async function loadIdl(): Promise<any> {
  // Placeholder. Once `program/` builds successfully, `anchor build`
  // generates a real IDL at program/target/idl/contribproof.json — copy
  // or fetch that into this Action rather than hand-writing one here.
  throw new Error(
    "No IDL available yet. This Action cannot run until program/ has a " +
      "real generated IDL to load."
  );
}

async function run(): Promise<void> {
  try {
    const context = github.context;
    const pr = context.payload.pull_request;

    if (!pr || !pr.merged) {
      core.info("Not a merged pull request event — skipping.");
      return;
    }

    const repoRoot = process.env.GITHUB_WORKSPACE || ".";
    const walletMapPath = core.getInput("wallet-map-path") || ".contribproof/wallets.json";
    const walletMap = loadWalletMap(repoRoot, walletMapPath);

    const githubUsername: string = pr.user.login;
    const walletAddress = walletMap[githubUsername];

    if (!walletAddress) {
      core.warning(
        `No wallet registered for @${githubUsername} in ${walletMapPath}. ` +
          `Skipping credential issuance — they need to add their address first.`
      );
      return;
    }

    const contributorPubkey = new PublicKey(walletAddress);
    const cluster = core.getInput("cluster") || "devnet";
    const merkleTree = new PublicKey(core.getInput("merkle-tree", { required: true }));
    const issuerSecret = core.getInput("issuer-authority-keypair", { required: true });
    const issuerKeypair = loadIssuerKeypair(issuerSecret);

    const endpoint =
      cluster === "mainnet-beta"
        ? "https://api.mainnet-beta.solana.com"
        : "https://api.devnet.solana.com";
    const connection = new Connection(endpoint, "confirmed");
    const provider = new AnchorProvider(connection, new Wallet(issuerKeypair), {
      commitment: "confirmed",
    });

    const idl = await loadIdl();
    const program = new Program(idl, provider);

    const repoFullName = context.repo.owner + "/" + context.repo.repo;
    const prNumber = pr.number as number;
    const role = pr.author_association === "MEMBER" ? "core-maintainer" : "contributor";

    core.info(`Issuing credential to ${walletAddress} for ${repoFullName}#${prNumber}...`);

    // NOTE: account list here is written against the shape of
    // `IssueCredential` in program/src/lib.rs as of the last update to
    // that file. If the accounts struct changes, this must change too —
    // there is no automatic sync between the two right now.
    const txSig = await program.methods
      .issueCredential(repoFullName, new BN(prNumber), role)
      .accounts({
        contributor: contributorPubkey,
        issuerAuthority: issuerKeypair.publicKey,
        merkleTree: merkleTree,
        // treeConfig, logWrapper, compressionProgram, bubblegumProgram,
        // systemProgram: fill in once the program's real account
        // requirements are confirmed by a working devnet mint.
      })
      .rpc();

    core.info(`Credential issued. Transaction: ${txSig}`);
    core.setOutput("transaction-signature", txSig);
  } catch (error: any) {
    core.setFailed(error.message ?? String(error));
  }
}

run();
