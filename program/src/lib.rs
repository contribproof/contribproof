use anchor_lang::prelude::*;
use mpl_bubblegum::{
    instructions::MintV1CpiBuilder,
    types::{MetadataArgs, TokenProgramVersion, TokenStandard},
};

// `anchor keys list` after your first `anchor build`.
declare_id!("ContrPrf11111111111111111111111111111111");

// -----------------------------------------------------------------------
// NOTE FOR WHOEVER PICKS THIS UP:
// This is a Phase 1 proof-of-concept skeleton, not audited or production
// code. It shows the intended shape of the program — a thin wrapper that
// CPIs into Metaplex's Bubblegum program to mint a compressed NFT credential
// — but the exact account list/order for MintV1CpiBuilder should be checked
// against whatever mpl-bubblegum version is pinned in Cargo.toml before this
// is trusted to compile or run. Bubblegum's CPI surface has changed across
// versions; treat every account below as "verify against current docs."
// -----------------------------------------------------------------------

#[program]
pub mod contribproof {
    use super::*;

    /// Called by an authorized issuer (e.g. a repo's GitHub Action, holding
    /// a keypair scoped only to this purpose) after a PR merges. Mints one
    /// compressed NFT credential to the contributor's wallet.
    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        repo: String,
        pr_number: u32,
        role: String,
    ) -> Result<()> {
        require!(repo.len() <= 100, CredentialError::RepoTooLong);
        require!(role.len() <= 40, CredentialError::RoleTooLong);

        // Encode the human-readable claim into the credential's on-chain
        // metadata. Keep this minimal and non-sensitive by design — repo
        // name, PR number, and role only. No personal data belongs here.
        let name = format!("ContribProof: {}", truncate(&repo, 20));
        let uri = format!(
            "https://contribproof.dev/credential/{}/{}",
            sanitize_for_uri(&repo),
            pr_number
        );

        let metadata = MetadataArgs {
            name,
            symbol: "CNTRB".to_string(),
            uri,
            seller_fee_basis_points: 0,
            primary_sale_happened: false,
            is_mutable: false,
            edition_nonce: None,
            token_standard: Some(TokenStandard::NonFungible),
            collection: None,
            uses: None,
            token_program_version: TokenProgramVersion::Original,
            creators: vec![],
        };

        MintV1CpiBuilder::new(&ctx.accounts.bubblegum_program.to_account_info())
            .tree_config(&ctx.accounts.tree_config.to_account_info())
            .leaf_owner(&ctx.accounts.contributor.to_account_info())
            .leaf_delegate(&ctx.accounts.contributor.to_account_info())
            .merkle_tree(&ctx.accounts.merkle_tree.to_account_info())
            .payer(&ctx.accounts.issuer_authority.to_account_info())
            .tree_creator_or_delegate(&ctx.accounts.issuer_authority.to_account_info())
            .log_wrapper(&ctx.accounts.log_wrapper.to_account_info())
            .compression_program(&ctx.accounts.compression_program.to_account_info())
            .system_program(&ctx.accounts.system_program.to_account_info())
            .metadata(metadata)
            .invoke()?;

        emit!(CredentialIssued {
            contributor: ctx.accounts.contributor.key(),
            repo: repo.clone(),
            pr_number,
            role: role.clone(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct IssueCredential<'info> {
    /// The wallet receiving the credential.
    /// CHECK: leaf owner only, no data read from this account directly.
    pub contributor: UncheckedAccount<'info>,

    /// The keypair authorized to issue credentials for this deployment
    /// (e.g. a key held by the GitHub Action, scoped to this purpose only).
    /// Pays for the mint and signs as tree creator/delegate.
    #[account(mut)]
    pub issuer_authority: Signer<'info>,

    /// CHECK: validated by the Bubblegum program via CPI.
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: validated by the Bubblegum program via CPI.
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: SPL Noop program, used for compression logging.
    pub log_wrapper: UncheckedAccount<'info>,

    /// CHECK: SPL Account Compression program.
    pub compression_program: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum program.
    pub bubblegum_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct CredentialIssued {
    pub contributor: Pubkey,
    pub repo: String,
    pub pr_number: u32,
    pub role: String,
}

#[error_code]
pub enum CredentialError {
    #[msg("Repo name is too long.")]
    RepoTooLong,
    #[msg("Role string is too long.")]
    RoleTooLong,
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max])
    }
}

fn sanitize_for_uri(s: &str) -> String {
    s.replace('/', "-")
}
