# Moloch Proposals

Use this reference when building or submitting Baal proposals on Base.

Default to high-level commands and concise summaries. Do not expose ABI fragments, raw calldata, or full JSON shapes unless the user asks for a technical review.

## Workflow

1. For env vars, install, and execution modes, see `setup.md` (same references folder).
2. Run proposal intent preflight before choosing a command (see table below).
3. Read DAO state first:
   ```bash
   moloch-agent read-dao --dao 0xDAO                           # primary
   node scripts/moloch.mjs read-dao --dao 0xDAO               # fallback
   ```
4. Optionally read indexed DAO/proposal context:
   ```bash
   moloch-agent dao --dao 0xDAO                                # primary
   node scripts/moloch.mjs graph-proposals --dao 0xDAO --first 20  # fallback
   ```
5. Find DAO memory pointers from `daoProfile.communityMemoryURI`, `daoProfile.sharedStateURI`, and `daoProfile.proposalWorkspaceURI` when available.
6. Let the CLI create and pin proposal workspaces automatically. Do not manually create proposal folders unless the task is draft-only or the operator provides an existing workspace URI.
7. Include `proposalOffering` as tx value for `submitProposal` unless the DAO uses zero offering.
8. Build and review the compact summary, then broadcast:
   - With the `moloch-agent` CLI: commands broadcast by default (`--build-only` for dry-run).
   - With the shared scripts: dry-run by default; add `--send` to broadcast.
9. Decode full calldata with `decode-submit-proposal` only when reviewing complex proposals or when asked.

## Proposal Intent Preflight

Choose the proposal path by operator intent:

| Operator asks for | Use |
| --- | --- |
| signal, temperature check, text-only governance intent | `signal` |
| join DAO with ERC-20 tribute, tokens-for-shares, tokens-for-loot | `tribute` / `join-dao` |
| grant or mint voting shares directly, no tribute involved | `mint-shares` |
| update DAO profile, shared memory URI, community state URI, hosted docs links | `dao-meta` / `dao-record` |
| change voting period, grace period, offering, quorum, retention | `gov-settings` |
| change share/loot pause or transferability setting | `token-settings` |
| arbitrary contract execution | custom proposal path |

If the operator asks for shares, loot, membership, admission, or a join request, do not use `signal`. A signal can express support for admission, but it does not create an executable membership proposal. Use `tribute` / `join-dao` when the member contributes ERC-20 tribute. Use `mint-shares` when the DAO directly grants voting shares with no tribute transfer.

## Details JSON

Build details independently when needed:

```bash
node scripts/moloch.mjs details \
  --title "Signal title" \
  --description "Signal body" \
  --link "https://..." \
  --proposal-type SIGNAL
```

Daohaus expects details JSON with `title`, `description`, optional `contentURI`, `contentURIType`, and `proposalType`.

## Signal Proposal

Proposal commands default `submitProposal` `baalGas` to `0`. This is intentional: Baal ignores a zero `baalGas`, while a low nonzero value can cause processing to fail with an out-of-gas style action failure. Use `--baal-gas` only when you know the required inner action gas. Use `--estimate-baal-gas` as an explicit opt-in for DAOhaus-style estimation with a default `1.2x` buffer.

Proposal offering is separate from tribute or payment amounts. Offering is native chain token sent as transaction `value` to satisfy the DAO's configured proposal offering. Tribute/swap amounts are contributed ERC-20 token amounts handled by Tribute Minion. Treasury payment amounts are encoded inside proposal actions.

```bash
node scripts/moloch.mjs signal \
  --dao 0xDAO \
  --title "Signal title" \
  --description "Signal body" \
  --link "https://..." \
  --value 0 \
  --send
```

Signal proposals encode a Poster `post` action inside `submitProposal`.
They do not issue shares, issue loot, transfer funds, or admit members.

If DAOhaus Admin shows a Poster decoding error such as `Encoded function signature "0x..." not found on ABI`, treat it as a malformed action until proven otherwise. A valid Poster signal action uses `post(string,string)` with selector `0x0ae1b13d`. Run `decode-submit-proposal` or `decode-proposal-data`; the decoder annotates Poster actions and flags unknown selectors.

## Membership Proposal Types

DAOhaus has at least two common executable membership paths:

- `tribute` / `join-dao`: submits through Tribute Minion for tokens-for-shares or tokens-for-loot.
- `mint-shares`: submits a Baal proposal that calls `mintShares(address[],uint256[])` on the DAO itself.
- `mint-loot`: submits a Baal proposal that calls `mintLoot(address[],uint256[])` on the DAO itself.

Use `mint-shares` for grants, steward admissions, retroactive rewards, or membership entries where no ETH/ERC-20 contribution should be escrowed by Tribute Minion.
Use `mint-loot` for non-voting rewards, trial memberships, reputation grants, or compensation that should not change voting power.

Share and loot quantities use human 18-decimal units by default. Use `--amount 10000` for 10,000 shares, not `10000000000000000000000`. Use `--amount-raw`, `--shares-raw`, or `--loot-raw` only when you intentionally want exact base units.

```bash
node scripts/moloch.mjs mint-shares \
  --dao 0xDAO \
  --to 0xMEMBER \
  --amount 1 \
  --title "Admit new voting member" \
  --description "Grant 1 voting share to the approved member." \
  --send
```

For multiple recipients, pass comma-separated values with matching lengths:

```bash
node scripts/moloch.mjs mint-shares \
  --dao 0xDAO \
  --to 0xA,0xB \
  --amount 1,2.5 \
  --title "Mint contributor shares" \
  --send
```

Loot-only reward example:

```bash
moloch-agent mint-loot \
  --dao 0xDAO \
  --to 0xMEMBER \
  --amount 100 \
  --title "Reward contributor with loot"
```

## Tribute / Join / Swap Proposal

Use this for tokens-for-shares or tokens-for-loot requests through the DAOhaus Tribute Minion.
This is the first-class membership/admission path when the member contributes ERC-20 tribute.
DAOhaus Admin labels this family "DAO Token Swap": request voting or non-voting DAO tokens in exchange for contributed tokens.

ERC-20 tribute:

```bash
moloch-agent tribute \
  --dao 0xDAO \
  --token 0xTOKEN \
  --amount 1000000 \
  --shares 1 \
  --loot 0 \
  --send
```

For ERC-20 tribute, check and approve Tribute Minion allowance before broadcasting. Native ETH, Baal's ETH sentinel, and `0x0000000000000000000000000000000000000000` token tribute are not supported by the DAOhaus Tribute Minion. Transaction `value` is the DAO proposal offering only; it is not tribute amount. Tribute token `--amount` remains raw token units because ERC-20 decimals vary; share/loot outputs use human 18-decimal units by default.

For native ETH-to-shares flows, wrap ETH into Base WETH first:

```bash
moloch-agent wrap-eth --amount 0.01 --send
moloch-agent approve-token \
  --token 0x4200000000000000000000000000000000000006 \
  --amount 0.01 \
  --send
moloch-agent tribute \
  --dao 0xDAO \
  --token 0x4200000000000000000000000000000000000006 \
  --amount 10000000000000000 \
  --shares 1 \
  --send
```

The WETH `tribute --amount` is raw token units, so `0.01 WETH` is `10000000000000000`.

The npm CLI also exposes `swap` and `token-swap` as aliases for the same Tribute Minion proposal family:

```bash
moloch-agent swap \
  --dao 0xDAO \
  --token 0xTOKEN \
  --amount 1000000 \
  --shares 0 \
  --loot 100
```

## Treasury Payment Proposal

Use `payment` when the DAO treasury should send native ETH or ERC-20 tokens to a recipient.

Native ETH payment:

```bash
moloch-agent payment \
  --dao 0xDAO \
  --recipient 0xPAYEE \
  --amount 0.01 \
  --title "Pay contributor"
```

ERC-20 payment:

```bash
moloch-agent payment \
  --dao 0xDAO \
  --recipient 0xPAYEE \
  --token 0xERC20 \
  --amount 100 \
  --decimals 6 \
  --title "Pay contributor in USDC"
```

For ERC-20 payments, provide `--amount-raw` for exact token base units or `--decimals` so the CLI can parse a human amount. For balance reads of ERC-20s, the token address is required.

## Ragequit

`ragequit` is not a proposal. It is a direct member exit action that burns the caller's shares and/or loot and claims proportional treasury assets. Treat it as serious and usually exceptional. Broadcast requires `--confirm-ragequit`.

Use `treasury-tokens --dao 0xDAO` first and pass the returned `ragequitTokensCsv` as `--tokens`.

## DAO Metadata / Shared Memory Proposal

Use this for DAOhaus-readable metadata, agent-readable rules, and shared community memory pointers.

Profile links:

```bash
node scripts/moloch.mjs dao-meta \
  --dao 0xDAO \
  --name "DAO Name" \
  --community-memory-uri ipfs://... \
  --proposal-workspace-uri ipfs://.../proposals \
  --shared-state-uri ipfs://.../versions/0001/community-state.md \
  --send
```

Custom records remain available for DAOs that already use Poster tables:

```bash
node scripts/moloch.mjs dao-record \
  --dao 0xDAO \
  --table charter \
  --content-file charter-record.json \
  --send

node scripts/moloch.mjs dao-record \
  --dao 0xDAO \
  --table joinRules \
  --content-file join-rules-record.json \
  --send
```

These build a proposal that posts a Poster record if passed. Use memory layer URIs for shared state, workspace roots, and larger versioned artifacts.

Current DAOhaus Admin indexes database-style Poster records. Signal proposals use `daohaus.proposal.database` from the DAO/Safe and usually write `table: "signal"`. Direct member-authored proposal commons posts should use `memory-post`, which defaults to `daohaus.member.database` and `table: "communityMemory"`.

## Proposal Workspace

The npm CLI creates and pins a proposal workspace automatically for proposal commands and stores the workspace URI in proposal details `contentURI`. In normal operation, do not manually build proposal workspace folders and do not pass `--link` or `--content-uri`.

Use manual workspace creation only when the operator explicitly gives an already-pinned workspace URI or asks for a draft-only artifact. If using a manual workspace, keep it small and predictable:

- proposal details
- action summary
- discussion notes
- vote reasons
- status and tx hashes

After submission, post new discussion, vote, and retro records with `memory-post`, linked by `proposalId`, `threadId`, and `workspaceURI`. Do not mutate an old IPFS workspace; publish a new version and post the new CID.

IPFS is immutable. Do not describe this as editing a folder or updating a table in place. Create a new versioned directory and publish the new CID.

Use Poster for proposal communication around the workspace:

```bash
node scripts/moloch.mjs memory-post \
  --dao 0xDAO \
  --table communityMemory \
  --thread-id proposal-draft-slug \
  --type draft-announcement \
  --workspace-uri ipfs://.../proposals/drafts/proposal-draft-slug \
  --body "Draft workspace created for review." \
  --send
```

Agents should post vote reasons, negotiation updates, and workspace version CIDs through Poster so other members can discover them through DAOhaus-indexed records. Use the shared `community-memory/v1` envelope and group proposal discussion with a stable `threadId`.

No-tribute membership request example:

```bash
moloch-agent mint-shares \
  --dao 0xDAO \
  --to 0xMEMBER \
  --amount 10000 \
  --title "Admit Charter Steward" \
  --send
```

## Governance Settings Proposal

Create `params.json`:

```json
{
  "title": "Update governance settings",
  "description": "Change voting and grace periods.",
  "votingPeriodInSeconds": 604800,
  "gracePeriodInSeconds": 604800,
  "newOffering": "0",
  "quorum": "50",
  "sponsorThreshold": "0",
  "minRetention": "66",
  "expiration": 0,
  "baalGas": "0",
  "value": "0"
}
```

Build:

```bash
node scripts/moloch.mjs gov-settings --dao 0xDAO --params params.json --send
moloch-agent gov-settings --dao 0xDAO --params params.json
```

## Token/Admin Settings Proposal

Daohaus names this token settings, but the Baal call is `setAdminConfig(bool pauseShares, bool pauseLoot)`.

```bash
node scripts/moloch.mjs token-settings \
  --dao 0xDAO \
  --pause-shares false \
  --pause-loot false \
  --title "Update token transfer settings" \
  --send

moloch-agent token-settings \
  --dao 0xDAO \
  --pause-shares false \
  --pause-loot false \
  --title "Update token transfer settings"
```

## Custom Proposal

For custom action proposals, use `custom-proposal` when a first-class command does not exist yet:

```json
[
  {
    "to": "0xTARGET",
    "value": "0",
    "data": "0xENCODEDCALLDATA",
    "operation": 0
  }
]
```

```bash
moloch-agent custom-proposal \
  --dao 0xDAO \
  --title "Custom action" \
  --description "Execute a mapped action that is not first-class yet." \
  --proposal-type CUSTOM \
  --actions actions.json
```

If working without the npm CLI, use the shared script pattern:

- Encode each action call with the target ABI.
- Pack actions into MultiSend bytes.
- Encode `multiSend(bytes)` as `proposalData`.
- Call `submitProposal(proposalData, expiration, baalGas, details)`.

Keep details JSON small and include `title`, `description`, optional `contentURI`, `contentURIType`, and `proposalType`.

For governance settings, `quorum` and `minRetention` are raw whole-number percentages from `0` to `100`. Do not use 18-decimal fixed point values.

Review:

```bash
node scripts/moloch.mjs decode-submit-proposal --data 0xFULL_CALLDATA
node scripts/moloch.mjs decode-proposal-data --data 0xINNER_PROPOSAL_DATA
```
