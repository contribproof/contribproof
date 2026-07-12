// STATUS: untested scaffold. Never run against a real minted credential.
//
// Verifying a compressed NFT requires an RPC endpoint that implements the
// DAS API (getAsset / getAssetProof) — plain Solana RPC nodes can't return
// compressed NFT data directly, since it lives inside a Merkle tree rather
// than a normal account. This is a real dependency on a third-party
// indexing provider (Helius and a few others offer free-tier DAS access),
// even though this page itself has no server of its own. Be upfront about
// that in any documentation calling this "backend-free" — it's frontend-only
// in the sense of "no server you run," not "no external dependency at all."

const RPC_ENDPOINT = "REPLACE_WITH_A_DAS_CAPABLE_RPC_URL";

async function dasRequest(method, params) {
  const res = await fetch(RPC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "contribproof-verifier",
      method,
      params,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  return json.result;
}

// Looks up all credentials owned by a wallet address.
async function verifyByWallet(address) {
  const result = await dasRequest("getAssetsByOwner", {
    ownerAddress: address,
    page: 1,
    limit: 50,
  });
  const credentials = (result.items || []).filter((item) =>
    (item.content?.metadata?.symbol || "") === "CNTRB"
  );
  return credentials;
}

// Looks up and verifies a single credential by its asset ID, including
// fetching and checking its Merkle proof.
async function verifyByAssetId(assetId) {
  const asset = await dasRequest("getAsset", { id: assetId });
  const proof = await dasRequest("getAssetProof", { id: assetId });

  // NOTE: this does not yet independently recompute and check the Merkle
  // root client-side — it currently trusts the DAS provider's proof
  // response as-is. A real "trustless" verifier should recompute the root
  // from `proof.proof` + `proof.leaf` and compare it against the on-chain
  // tree account directly, rather than trusting the indexer's word for it.
  // Flagging this as a known gap rather than quietly shipping a verifier
  // that doesn't actually verify anything independent of its data source.
  return { asset, proof, independentlyVerified: false };
}

function isLikelyAssetId(input) {
  // Placeholder heuristic — asset IDs and wallet addresses are both
  // base58 pubkeys, so there's no reliable way to distinguish them from
  // format alone. Real implementation should probably just try one, then
  // fall back to the other, rather than guessing.
  return input.length > 32;
}

document.getElementById("verify-btn").addEventListener("click", async () => {
  const input = document.getElementById("query-input").value.trim();
  const resultEl = document.getElementById("result");
  resultEl.style.display = "block";
  resultEl.className = "";
  resultEl.textContent = "Checking...";

  if (RPC_ENDPOINT.startsWith("REPLACE_")) {
    resultEl.className = "fail";
    resultEl.textContent =
      "No RPC endpoint configured. This scaffold needs a real DAS-capable RPC URL before it can check anything.";
    return;
  }

  try {
    if (isLikelyAssetId(input)) {
      const { asset, proof, independentlyVerified } = await verifyByAssetId(input);
      resultEl.className = "ok";
      resultEl.innerHTML =
        `Found credential.<br>Independently verified on-chain: ${independentlyVerified ? "yes" : "NOT YET IMPLEMENTED"}` +
        `<pre>${JSON.stringify({ asset, proof }, null, 2)}</pre>`;
    } else {
      const credentials = await verifyByWallet(input);
      resultEl.className = credentials.length ? "ok" : "fail";
      resultEl.innerHTML = credentials.length
        ? `${credentials.length} credential(s) found for this wallet.<pre>${JSON.stringify(credentials, null, 2)}</pre>`
        : "No ContribProof credentials found for this wallet.";
    }
  } catch (err) {
    resultEl.className = "fail";
    resultEl.textContent = "Error: " + err.message;
  }
});
