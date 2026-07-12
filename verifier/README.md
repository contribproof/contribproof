# contribproof (verifier)

Phase 1 scaffold for the public verifier page. **Untested — no credentials
exist yet to verify against**, since `program/` isn't minting on devnet.

## What this is

A static HTML/JS page (`index.html` + `app.js`, no build step, no server)
that looks up a wallet or credential ID and displays what it finds.

## The "no backend" claim needs a caveat

The grant proposal describes this verifier as having no backend
dependency. That's true in the sense that *you* don't run a server for it —
but reading compressed NFT data at all requires an RPC endpoint that
implements the **DAS API** (`getAsset`, `getAssetProof`, `getAssetsByOwner`).
Plain Solana RPC nodes can't return this data directly, because compressed
NFTs live inside a Merkle tree, not a normal on-chain account. In practice
this page depends on a third-party DAS-capable provider (Helius offers a
free tier; there are others).

Recommendation: be explicit about this in any public-facing docs rather
than implying full trustlessness. "No server we run" and "no external
dependency" are different claims, and conflating them is the kind of thing
a technically sharp grant reviewer will notice.

## A real gap, not just a caveat: proofs aren't independently checked yet

`verifyByAssetId()` in `app.js` currently trusts whatever Merkle proof the
DAS provider hands back — it does not recompute the root from the raw
proof and leaf data and compare it against the tree account on-chain. That
means, as written, this "verifier" is really just displaying what an
indexer says, not independently confirming it. Closing that gap — actually
recomputing and checking the root client-side — is real remaining work
before this can honestly be called a verifier rather than a viewer.

## Setup

1. Get a DAS-capable RPC URL (e.g. from Helius) and replace
   `RPC_ENDPOINT` in `app.js`. Don't commit a real API key to a public
   repo — for a static site with no server, you'll need to either use a
   rate-limited public endpoint or figure out a way to keep the key out of
   client-side code (a genuine open design question, not solved here).
2. Once `program/` has minted a real credential on devnet, test both
   lookup paths (by wallet, by asset ID) against it.
3. Implement independent Merkle root verification before treating this as
   done — see the gap noted above.
