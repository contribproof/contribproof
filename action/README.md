# contribproof (GitHub Action)

Phase 1 scaffold for the Action that issues a credential when a pull
request merges. **Untested — do not add this to a live repo's workflow
yet.** It depends on `program/`, which does not compile or mint on devnet
yet as of this write-up.

## The wallet-mapping problem

GitHub has no built-in concept of a Solana wallet, so the Action needs some
way to know which wallet a given contributor wants their credential sent
to. This scaffold uses the simplest option: a JSON file committed to the
repo, mapping GitHub usernames to wallet addresses.

```json
// .contribproof/wallets.json
{
  "octocat": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
  "some-other-contributor": "5FHwkrdxD5AKmYrGwv..."
}
```

This is a real design decision, not a neutral default, and it has known
tradeoffs worth revisiting before Phase 1 is called done:

- **Pro:** no external service, no database, fits the "no backend
  dependency" claim in the grant proposal.
- **Con:** a contributor has to know this file exists and add themselves
  to it via a PR before their *first* credential can be issued — that's
  friction the proposal doesn't currently account for.
- **Con:** anyone with write access can edit the mapping, which means the
  file itself needs review discipline (a CODEOWNERS rule on that path is
  probably worth adding once this is real).

Alternatives considered but not built: a PR-comment-based registration
flow, or an external lookup service. Both add complexity or a backend
dependency; the file-based approach was chosen to stay consistent with the
project's "no backend" design, but this should be revisited if it proves
too much friction for real contributors.

## Setup (once program/ actually works)

1. Generate the real Anchor IDL from a working `program/` build and wire
   it into `loadIdl()` in `src/index.ts` — currently a stub that throws.
2. Add repo secrets: `ISSUER_AUTHORITY_KEYPAIR` (the keypair that pays for
   and signs mints — treat this as sensitive; a compromised key can mint
   junk credentials against your tree).
3. Add a workflow file, e.g. `.github/workflows/contribproof.yml`, that
   triggers on `pull_request: types: [closed]` and runs this Action.
4. Confirm end-to-end on a throwaway devnet repo before pointing this at
   anything real.

## Known gaps

- `loadIdl()` is unimplemented.
- The `.accounts()` call in `src/index.ts` is missing several accounts
  (`treeConfig`, `logWrapper`, `compressionProgram`, `bubblegumProgram`,
  `systemProgram`) that `program/`'s `IssueCredential` struct requires —
  left out because their exact handling depends on how tree creation ends
  up being done, which isn't decided yet.
- No handling yet for edge cases: squash merges, bot-authored PRs, PRs
  from forks, or a contributor merging their own PR as a maintainer.
