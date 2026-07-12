# ContribProof

Free, open-source, on-chain credit for open-source work.

ContribProof lets any GitHub project issue verifiable, on-chain credentials
to its contributors when a pull request merges — using Solana's compressed
NFTs to make it cheap enough to certify every merge, not just the flagship
ones.

> **Status: Phase 1, early development.** This project is currently
> pre-launch. The core program is a proof-of-concept skeleton (see
> `program/`), not yet deployed or tested against a live tree. Nothing here
> is production-ready. See [Status](#status) below for specifics.

---

## The problem

A contributor's history on an open-source project currently lives and dies
with a platform. A GitHub profile can be deleted, a repo can go private, a
"top contributor" badge on some dashboard isn't independently checkable by
anyone outside that platform. There's no portable, tamper-proof way for
someone to prove the open-source work they've actually done.

## How it works

1. **Contribute** — A pull request gets merged into a repo that has opted
   in to ContribProof. Nothing changes about how a contributor submits
   work.
2. **Mint** — A GitHub Action, triggered on merge, calls the ContribProof
   program, which mints a compressed NFT credential to the contributor's
   wallet, referencing the repo, PR, and role.
3. **Verify** — Anyone can check a credential on a public verifier page by
   confirming its Merkle proof directly on-chain. No login, no API key, no
   trusting a third-party database.

## Why Solana

The entire premise depends on issuing a credential being cheap enough to do
for *every* merged PR across every opted-in repo, not just a handful of
high-profile contributions. Solana's state compression stores NFT data in a
Merkle tree instead of individual accounts, cutting minting costs by
roughly three orders of magnitude compared to account-based NFTs on most
other chains. That's the difference between a system a project can actually
afford to run at scale, and one that only makes sense for a few VIP
contributors.

## Architecture

```
contribproof/
├── program/     Anchor program (Rust) — mints & verifies compressed-NFT
│                credentials via CPI into Metaplex's Bubblegum program.
├── action/      GitHub Action / issuer SDK (Node) — triggers a mint on
│                PR merge. Not yet started.
├── verifier/    Static, public verifier front end — checks a credential's
│                Merkle proof on-chain. Not yet started.
├── README.md
└── LICENSE
```

Each component is scoped as its own milestone — see the funding breakdown
on [the project site] for how Phase 1 is budgeted.

## Status

Being specific about where things actually stand, rather than implying more
progress than exists:

- [x] Problem, architecture, and Phase 1 budget defined
- [x] Program skeleton written (`program/`) — CPI structure sketched out
      against Bubblegum, **not yet compiled or tested**
- [ ] Program deployed and minting successfully on devnet
- [ ] GitHub Action / issuer SDK (`action/`)
- [ ] Public verifier (`verifier/`)
- [ ] Pilot repos onboarded

This is a solo, first-time Solana project. Progress will be logged here and
in commit history as it happens rather than announced after the fact.

## Getting started (once the program is working)

Detailed setup steps live in [`program/README.md`](./program/README.md).
In short: install the Solana and Anchor CLIs, build the program, create a
devnet Merkle tree, and mint a test credential against it. This section
will be filled in properly once that path is confirmed working end-to-end.

## Contributing

This project isn't accepting external contributions yet while the core
program is still being proven out — but issues and questions are welcome.
Once the program mints successfully on devnet, contribution guidelines will
be added here.

## License

MIT — see [`LICENSE`](./LICENSE). Every usable part of this project is
open-source from the first commit; that's a condition of the funding this
project is seeking, not an afterthought.

## Contact

Osbaldo Jacobi — contribproof@gmail.com
