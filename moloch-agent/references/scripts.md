# Moloch Shared Scripts Reference

Full command cheatsheet for `scripts/moloch.mjs`. Load this reference when you need a command not yet exposed by the `moloch-agent` CLI, or when you need the decode tools, operator output rules, or proposal data encoding details.

For install, env vars, and execution mode flags, see `setup.md` (same references folder).

## Common Commands

```bash
node scripts/moloch.mjs capabilities
node scripts/moloch.mjs new-account
node scripts/moloch.mjs read-dao --dao 0xDAO
node scripts/moloch.mjs read-proposal --dao 0xDAO --proposal 1
node scripts/moloch.mjs graph-dao --dao 0xDAO
node scripts/moloch.mjs graph-proposal --dao 0xDAO --proposal 1
node scripts/moloch.mjs graph-proposals --dao 0xDAO --first 20
node scripts/moloch.mjs graph-dao-history --dao 0xDAO --first 100
node scripts/moloch.mjs graph-members --dao 0xDAO --first 100
node scripts/moloch.mjs graph-member --dao 0xDAO --member 0xMEMBER
node scripts/moloch.mjs graph-records --dao 0xDAO --table daoProfile
node scripts/moloch.mjs graph-records --dao 0xDAO --table signal
node scripts/moloch.mjs graph-records --dao 0xDAO --table communityMemory
node scripts/moloch.mjs task-snapshot --dao 0xDAO --out-dir /data/custom/moloch-skills/artifacts/0xDAO
node scripts/moloch.mjs proposal-lifecycle --dao 0xDAO --proposal 1
node scripts/moloch.mjs process-queue --dao 0xDAO --first 100
node scripts/moloch.mjs details --title "..." --description "..." --proposal-type SIGNAL
node scripts/moloch.mjs decode-proposal-data --data 0x...
node scripts/moloch.mjs decode-submit-proposal --data 0x...
node scripts/moloch.mjs signal --dao 0xDAO --title "..." --description "..."
node scripts/moloch.mjs dao-meta --dao 0xDAO --name "DAO Name" --community-memory-uri ipfs://... --shared-state-uri ipfs://.../versions/0001/community-state.md
node scripts/moloch.mjs memory-post --dao 0xDAO --table communityMemory --thread-id proposal-1 --body "..." --send
node scripts/moloch.mjs dao-record --dao 0xDAO --table charter --content-file charter-record.json
node scripts/moloch.mjs wrap-eth --amount 0.01 --send
node scripts/moloch.mjs approve-token --token 0x4200000000000000000000000000000000000006 --amount 0.01 --send
node scripts/moloch.mjs treasury-tokens --dao 0xDAO
node scripts/moloch.mjs ragequit --dao 0xDAO --to 0xRECIPIENT --shares 1 --loot 0 --tokens ETH --confirm-ragequit --send
node scripts/moloch.mjs tribute --dao 0xDAO --token 0xERC20 --amount 1000000 --shares 0 --loot 1000
node scripts/moloch.mjs mint-shares --dao 0xDAO --to 0xMEMBER --amount 10000
node scripts/moloch.mjs gov-settings --dao 0xDAO --params params.json
node scripts/moloch.mjs token-settings --dao 0xDAO --pause-shares false --pause-loot false
node scripts/moloch.mjs sponsor --dao 0xDAO --proposal 1
node scripts/moloch.mjs vote --dao 0xDAO --proposal 1 --approved true
node scripts/moloch.mjs process --dao 0xDAO --proposal 1 --proposal-data 0x...
node scripts/moloch.mjs summon --params summon.json
```

Use `--compact` for operator-facing output that hides large calldata fields. Use `--send` to broadcast (scripts dry-run by default).

For autonomous action tasks, add `--send` after live preflight confirms the managed wallet has permission and funds. Omit `--send` only for explicit dry-run/review/draft tasks or when a technical blocker prevents sending.

Lifecycle reference fixtures live in `fixtures/proposal-lifecycle.fixture.json`.

Use `--vault-provider 1password --vault-item <item> --vault-field private_key` with `--send` to load a private key from 1Password CLI without exporting `PRIVATE_KEY`.

## Network Config

Contract addresses, the DAOhaus subgraph ID, and Poster tags are in `config/networks.json`.

Look up a specific address at runtime — do not hardcode values in skill files or agent prompts:

```bash
node scripts/network-config.mjs --key V3_FACTORY_ADV_TOKEN
node scripts/network-config.mjs --key TRIBUTE_MINION
node scripts/network-config.mjs --contracts   # full contracts map
node scripts/network-config.mjs               # full Base config
```

## Decode Tools

Use the decode tools when reviewing complex proposals or when the caller asks for a technical breakdown:

```bash
node scripts/moloch.mjs decode-submit-proposal --data 0xFULL_CALLDATA
node scripts/moloch.mjs decode-proposal-data --data 0xINNER_PROPOSAL_DATA
```

`decode-submit-proposal` takes the full `submitProposal(...)` calldata.
`decode-proposal-data` takes only the inner `proposalData` bytes (the MultiSend payload).

The decoder annotates Poster actions and flags unknown selectors. A valid Poster signal action uses `post(string,string)` with selector `0x0ae1b13d`. If DAOhaus Admin shows `Encoded function signature not found on ABI`, decode first before concluding the action is malformed.

## Operator Output

Default to abstract summaries for humans. Do not print ABI fragments, large calldata, or full Graph JSON unless the user asks. If raw data is needed for review, save it to a file and summarize the file path, target, value, and risk.

Use these helpers instead of raw tuple interpretation:

- `read-proposal` returns named `getProposalStatus` flags: `cancelled`, `processed`, `passed`, `actionFailed`.
- `proposal-lifecycle` derives statuses such as `unsponsored`, `voting`, `grace`, `needsProcessing`, `failed`, and `processedPassed`.
- `process-queue` sorts ready proposals oldest first.

## Proposal Data Encoding

Moloch V3 proposals call `submitProposal(bytes proposalData, uint32 expiration, uint256 baalGas, string details)`.

- `proposalData` is usually a Gnosis MultiSend `multiSend(bytes)` call encoded against the MultiSend ABI.
- Signal proposals post metadata through Poster.
- Direct membership grants encode `mintShares(address[],uint256[])` against the Baal DAO.
- Baal shares and loot have 18 decimals. Proposal command summaries include both the original human input and the encoded raw amount where relevant.
- Governance settings encode `setGovernanceConfig(bytes)` where the inner bytes are:
  `uint32 votingPeriodInSeconds, uint32 gracePeriodInSeconds, uint256 newOffering, uint256 quorum, uint256 sponsorThreshold, uint256 minRetention`.
- `quorum` and `minRetention` are raw whole-number percentages from `0` to `100`, not 18-decimal fixed-point values. Use `30` for 30%, `50` for 50%, and `67` for an approximate 66.6% retention guard.
- Token settings encode `setAdminConfig(bool pauseShares, bool pauseLoot)`.
- `details` is a JSON string with title, description, optional `contentURI`, `contentURIType`, and `proposalType`.

Proposal commands default `submitProposal` `baalGas` to `0`. Baal ignores zero, while a low nonzero value can make processing fail with an out-of-gas style action failure. Use `--baal-gas` only when you know the required inner action gas. Use `--estimate-baal-gas` to opt in to DAOhaus-style estimation with a default `1.2x` buffer.

For `process`, the CLI sets a transaction gas limit because wallet/RPC estimation can undercount inner proposal actions. Default is the larger of `800000` or stored `baalGas + 400000`. Override with `--gas-limit`.

For Baal shares and loot, the CLI accepts human 18-decimal token units by default:

- `mint-shares --amount 10000` means 10,000 voting shares.
- `tribute --shares 1 --loot 1000` means 1 share and 1,000 loot.
- Use `--amount-raw`, `--shares-raw`, or `--loot-raw` only for exact base units.
- Tribute token `--amount` remains raw token units because ETH/ERC-20 decimals vary.

## Safety Checks

Before broadcasting:

1. Verify the chain is Base and the DAO address is the intended Baal contract.
2. Read `proposalOffering`; include that value when submitting proposals unless intentionally overriding.
3. For sponsor/vote/process/cancel, read the proposal first and check status fields.
4. If processing, use the exact Graph-indexed `proposalData` for that proposal. Do not reconstruct it from memory if indexed data is available.
5. Record the returned tx hash and re-read state after confirmation.
