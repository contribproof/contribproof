# contribproof (program)

Phase 1 proof-of-concept skeleton for the ContribProof Anchor program.

## What this is

A single instruction, `issue_credential`, that CPIs into Metaplex's
Bubblegum program to mint a compressed NFT credential to a contributor's
wallet. This is the piece referred to as "Component 1: Core Anchor program"
in the grant proposal's budget breakdown.

## What this is NOT

- Not audited
- Not tested against a live devnet tree yet
- Not guaranteed to compile as-is — the Bubblegum CPI account list/order
  should be checked against whatever `mpl-bubblegum` version ends up pinned
  in `Cargo.toml`, since that crate's interface has changed across versions

## To actually get this running, in order

1. Install the Solana CLI and Anchor CLI locally.
2. `anchor build` — expect dependency-version friction on first try; check
   crates.io for current `mpl-bubblegum` / `spl-account-compression`
   versions and adjust `Cargo.toml` if the pinned versions here are stale.
3. `anchor keys list` to get your real program ID, then replace the
   `declare_id!` placeholder in `src/lib.rs` and in `Anchor.toml`.
4. Create an actual Merkle tree + tree config on devnet (Bubblegum has a
   separate `create_tree` instruction for this — not included in this
   skeleton, since tree creation is a one-time setup step, not part of the
   per-credential mint flow).
5. Call `issue_credential` against that tree with a devnet contributor
   wallet and confirm a compressed NFT actually shows up (Solana Explorer
   or a cNFT-aware wallet like Phantom will render it).
6. That successful end-to-end mint is your Proof-of-Concept link for the
   grant application.

## Known open questions to resolve before Phase 1 is "beta complete"

- Who holds `issuer_authority` in production — a single project-wide key,
  or a per-repo key generated when a maintainer opts in? This affects both
  security and the GitHub Action's design (Component 2).
- Rate limiting / abuse prevention — nothing here stops a compromised
  `issuer_authority` from minting junk credentials. Worth a design pass
  before mainnet.
