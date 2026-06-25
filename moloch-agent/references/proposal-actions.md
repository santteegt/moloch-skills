# Moloch Proposal Actions

Use this reference for proposal lifecycle actions.

## Workflow

1. For env vars, install, and execution mode flags, see `setup.md` (same references folder).
2. Read proposal state before acting:
   ```bash
   moloch-agent proposal --dao 0xDAO --proposal 1                     # primary
   node scripts/moloch.mjs read-proposal --dao 0xDAO --proposal 1    # fallback
   ```
3. Read indexed proposal details:
   ```bash
   moloch-agent proposal --dao 0xDAO --proposal 1                     # primary
   node scripts/moloch.mjs graph-proposal --dao 0xDAO --proposal 1   # fallback
   ```
4. Derive lifecycle:
   ```bash
   moloch-agent proposal-lifecycle --dao 0xDAO --proposal 1           # primary
   node scripts/moloch.mjs proposal-lifecycle --dao 0xDAO --proposal 1 # fallback
   ```
5. If live preflight passes: broadcast. With the CLI, commands broadcast by default.
   With the scripts, add `--send`. Build unsigned (`--build-only` / omit `--send`) only
   for explicit dry-run, review, or external wallet flows.
6. Re-read the proposal after confirmation and record the tx hash.

## Commands

Sponsor:

```bash
moloch-agent sponsor --dao 0xDAO --proposal 1
# Fallback: node scripts/moloch.mjs sponsor --dao 0xDAO --proposal 1 --send
```

Vote:

```bash
moloch-agent vote --dao 0xDAO --proposal 1 --approved true --reason "Aligned with my mandate."
moloch-agent vote --dao 0xDAO --proposal 1 --approved false --reason "I voted no because the proposal needs clearer deliverables."
```

When using the npm CLI, include `--reason` whenever the agent has a substantive yes/no rationale. The CLI posts a `vote-reason` memory record linked to the proposal, then submits the vote.

Process:

```bash
moloch-agent process-ready --dao 0xDAO
# or a specific proposal:
moloch-agent process --dao 0xDAO --proposal 1
# Fallback: node scripts/moloch.mjs process --dao 0xDAO --proposal 1 --proposal-data 0x... --send
```

Processing is required contract maintenance after governance is complete. It is not a second vote. If `process-queue` marks a proposal as the first chain-ready item, process it unless chain preflight fails, exact indexed `proposalData` is unavailable or mismatched, or signer/gas is unavailable.

Use an explicit process gas limit. Wallet/RPC estimation can undercount inner proposal actions and still produce a successful outer transaction with `actionFailed: true`. The CLI sets one automatically: stored `baalGas + 400000`, or `800000` when stored `baalGas` is `0`. Override with `--gas-limit` only when needed.

For processing, get `proposalData` from `graph-proposal`. Decode it before sending if there is any ambiguity:

```bash
node scripts/moloch.mjs decode-proposal-data --data 0xPROPOSAL_DATA
```

Queue processing oldest ready proposal first:

```bash
moloch-agent process-queue --dao 0xDAO
# Fallback: node scripts/moloch.mjs process-queue --dao 0xDAO --first 100
```

Process only the first item in `process-queue`. After a successful process transaction, re-run `process-queue` before processing the next proposal. Baal proposals are ordered by `prevProposalId`; later proposals may appear ready by time/vote checks but still be blocked until earlier proposals are terminal.

Cancel:

```bash
moloch-agent cancel --dao 0xDAO --proposal 1
# Fallback: node scripts/moloch.mjs cancel --dao 0xDAO --proposal 1 --send
```

## Eligibility

- Sponsor requires delegated voting tokens at or above `sponsorThreshold`.
- Vote requires current voting power and an active voting period.
- Process requires `proposal-lifecycle` to show `processableNow: true` and needs the exact original Graph-indexed `proposalData`.
- Do not use indexed `passed` as a prerequisite for process candidates. Graph can lag or disagree with chain state.
- For processability, use Graph only to find candidate proposal IDs, timing hints, metadata, and original `proposalData`; then verify direct chain `state(id) == Ready`, previous-proposal state, and `getProposalStatus` processed/cancelled/actionFailed flags.
- Use `process-queue --first 100` or larger for watcher tasks so older ready proposals are not missed.
- Always process in ascending proposal order from `process-queue`; do not skip ahead unless the earlier proposal is terminal on chain.
- `process --send` runs lifecycle preflight by default when Graph/RPC are configured. Use `--skip-preflight` only for a deliberate expert override.

## Sponsor Then Vote Race

After sponsoring, do not immediately assume voting is available. Re-read `proposal-lifecycle` or poll briefly until status becomes `voting`. If an immediate vote reverts with `!determined`, wait and retry after state/indexing advances.
- Cancel is usually proposer, sponsor-below-threshold, or governance shaman behavior.

If eligibility is unclear, read DAOhaus indexed state and direct contract state before sending.
