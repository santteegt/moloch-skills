---
name: moloch-agent
description: Operate an autonomous DAOhaus/Moloch V3 agent on Base with minimal setup. The hosted moloch service handles Graph reads and IPFS pinning so the agent only needs a DAO address, a mandate, and a local signing wallet. Use this skill as the default entry point for all DAOhaus/Moloch V3 operations unless the operator explicitly requests ClawBank integration.
---

# Moloch Agent

Default entry point for autonomous DAOhaus/Moloch V3 agents on Base. The hosted moloch
service handles Graph reads and IPFS pinning. Signing always stays local — private keys
are never sent to the service.

---

## Tooling Hierarchy

**Preferred — moloch-agent MCP server (if configured):**

```bash
npx -p @raidguild/meta-clawtel moloch-agent-mcp
```

Use it when the agent runtime can spawn a local MCP server over stdio. It wraps the same
build/read logic as the CLI as individually callable, typed tools (`moloch_*` for
transaction builders and chain reads, `moloch_service_*` for hosted-service passthroughs
— e.g. `moloch_summon`, `moloch_vote`, `moloch_read_dao`), so the agent composes
operations by calling tools directly instead of shelling out to the CLI and parsing
stdout. Every write tool is build-only — it returns an unsigned
`{ to, value, data, chainId }` and never signs, same boundary as the CLI's
`--build-only`, just with no signing path in this transport at all.

Wallet-model fit: the CLI path is for a **managed wallet** (`PRIVATE_KEY` or a platform
wallet skill signing directly as an EOA); the MCP server path is for a **smart account**
— its unsigned-tx output is the shape a smart-contract-wallet flow (Safe, ERC-4337
userOp, session keys) consumes and executes itself.

**Primary — moloch-agent CLI:**

```bash
npm install -g @raidguild/meta-clawtel
moloch-agent health
moloch-agent capabilities
```

Use `moloch-agent` for all standard operations: reads, proposal creation, proposal actions,
summon, IPFS pinning, and DAO memory posts.

**Fallback — shared scripts:**

```bash
node scripts/moloch.mjs capabilities
```

Use `scripts/moloch.mjs` only when a specific command is not yet exposed
by the CLI, or when the CLI package is unavailable.

> **Script setup**: if installed via `npx skills`, run `npm install` once in the skill
> directory (e.g. `.agents/skills/moloch-agent/`) before using `scripts/moloch.mjs`.
> The `moloch-agent` CLI needs no install step.

> **Inverted defaults**: `moloch-agent` broadcasts by default (`--build-only` for dry-run).
> `moloch.mjs` dry-runs by default (`--send` to broadcast). Do not mix flags between them.

For full install instructions, environment variables, execution modes, MCP server setup,
and 1Password CLI integration, read `references/setup.md`.

---

## Minimal Operator Inputs

Resolve these from the harness/environment first. Ask the operator only for values that
are missing and required for the immediate task.

**Existing DAO:**
- DAO address.
- Agent mandate or mandate source.
- Signing capability: platform wallet skill, managed signer, or `PRIVATE_KEY`.

**New summon:**
- DAO name and token symbols.
- Initial members with share/loot balances.
- Governance settings not already in a template.
- Agent mandate or mandate source.
- Signing capability.

Do not ask for: Graph API key, Pinata JWT, DAOhaus subgraph ID, Poster contract tags.
The hosted service supplies those. Do not ask for watch-only mode, review mode, or
no-action rules during the first prompt unless the operator explicitly requested them.
Default to autonomous operation.

---

## Platform Skill Inventory

On bootstrap, inventory harness/platform skills and prefer them over generic fallbacks:

| Capability | Platform skill (preferred) | Fallback |
|---|---|---|
| Transaction building & reads | `moloch-agent` MCP server (if configured; smart-account signing) | `moloch-agent` CLI, `--build-only` for unsigned tx (managed-wallet signing) |
| Wallet/account | Platform wallet skill | `PRIVATE_KEY` + `moloch-agent account` |
| IPFS publishing | Platform Pinata/IPFS skill | `moloch-agent pin-json` |
| Scheduler/tasks | Platform task skill | Write task prompts from `references/agent-tasks.md` |
| Secrets | Platform secrets skill | Shell env vars |
| RPC | Managed RPC credential | Public RPC for the resolved default chain (light reads only) |

Record detected capabilities in the bootstrap output before scheduling autonomous work.

---

## Source Authority

| Source | Use for |
|---|---|
| Direct chain / RPC | Execution truth: proposal lifecycle, voting window, processing preflight. |
| Hosted moloch service | Graph discovery, indexed history, IPFS pinning. |
| DAO database records | Shared coordination and memory events. |
| IPFS CIDs | Larger/versioned artifacts and proposal workspaces. |
| Local files | Scratch, checkpoints, and task continuity only. |

Graph data can lag. Never rely on hosted Graph data alone to decide a transaction is safe
to send. Re-read chain state before every write action.

---

## Bootstrap

First-run flow for a new or existing DAO:

1. Confirm DAO address or summon intent.
2. Detect the moloch-agent MCP server first, by tool presence — look for `moloch_*` /
   `moloch_service_*` in the runtime's available tools (or call `tools/list`), not by
   any particular registration label, since the operator may have registered it under
   any key. Use it for transaction building & reads this session if present. Otherwise
   detect platform skills and local CLI/runtime capabilities.
3. Detect signer from platform wallet skill, `ACCOUNT_ADDRESS`, `PRIVATE_KEY`,
   or `moloch-agent account`.
4. Load the operator-provided mandate or mandate source. Do not invent the mandate.
5. Discover existing shared memory pointers from DAO metadata, or create starter
   pointers when summoning.
6. Run a task snapshot once a DAO address is known.
7. Configure scheduled tasks when a scheduler is available.
8. Report only hard blockers.

For the full bootstrap flow, read `references/bootstrap.md`.

---

## Core Read Commands

```bash
moloch-agent networks
moloch-agent dao --dao 0xDAO
moloch-agent daohaus-url --dao 0xDAO
moloch-agent links --dao 0xDAO --proposal 12
moloch-agent read-dao --dao 0xDAO
moloch-agent balances --dao 0xDAO
moloch-agent balances --address 0xADDRESS --token 0xERC20
moloch-agent treasury-tokens --dao 0xDAO
moloch-agent proposals --dao 0xDAO
moloch-agent proposal --dao 0xDAO --proposal 12
moloch-agent proposal-lifecycle --dao 0xDAO --proposal 12
moloch-agent process-queue --dao 0xDAO
moloch-agent members --dao 0xDAO
moloch-agent records --dao 0xDAO --table communityMemory
moloch-agent account
```

If the MCP server is registered (preferred — see `references/setup.md`), call its tools
directly instead of shelling out. Same operations, e.g.:

```text
moloch_list_networks  {}
moloch_read_dao       { "dao": "0xDAO" }
moloch_read_proposal  { "dao": "0xDAO", "proposal": 12 }
moloch_service_list_proposals { "dao": "0xDAO" }
```

That's illustrative, not literal syntax — call `tools/list` for each tool's exact input
schema; most `moloch-agent <cmd>` reads above have a `moloch_*`/`moloch_service_*`
counterpart following the same naming convention (`--dao` → `dao`, etc.).

`networks` / `moloch_list_networks` takes no `--dao` — it lists every chain this build
of `moloch-agent` supports (chain ID, name, default RPC/service URLs, contract
addresses, Poster tags), not just the one it's currently configured for. Only Base
(`8453`) is registered today, but check this instead of assuming — it's the mechanism
this skill would use to pick up additional chains without a doc rewrite once
`santteegt/moloch-agent`'s registry grows past Base.

`daohaus-url` returns the DAOhaus Admin URL:
`https://admin.daohaus.club/molochv3/0x2105/0xDAO/proposals`

---

## Summon

Create a params file and summon through the CLI:

```bash
moloch-agent summon --params summon.json
```

Params must include: initial members, raw share/loot base-unit balances, token names,
voting/grace periods, quorum, sponsor threshold, and min retention. If memory pointers
(`communityMemoryURI`, `proposalWorkspaceURI`, `sharedStateURI`) are omitted, the CLI
creates and pins a starter workspace and includes its `ipfs://` URI in summon metadata.

- Use whole-number percentages for `quorum` and `minRetention`.
- Use 18-decimal base units for shares, loot, offering, and sponsor threshold.
- **Address rule**: never expand shortened previews like `0x1234...abcd`. Use only full
  `0x` 40-hex-character addresses. Run `moloch-agent account` and copy the returned
  `address` exactly for founder/signer params.

---

## Proposal Creation

Proposal path decision:

| Intent | Command |
|---|---|
| Text-only intent or signal | `signal` |
| Token tribute + join | `join-dao` / `tribute` |
| Token swap | `swap` / `token-swap` |
| Direct share grant (no tribute) | `mint-shares` |
| Direct loot grant (no tribute) | `mint-loot` |
| Treasury ETH / ERC-20 payment | `payment` |
| Governance settings change | `gov-settings` |
| Token pause / transfer settings | `token-settings` |
| Arbitrary on-chain action | `custom-proposal` |

Do not use `signal` for membership, tribute, or treasury payment actions.

Proposal throttle: do not create a new proposal when 3 or more are currently in voting.

Common proposal commands:

```bash
moloch-agent signal --dao 0xDAO --title "..." --description "..."
moloch-agent gov-settings --dao 0xDAO --params gov-settings.json
moloch-agent token-settings --dao 0xDAO --pause-shares false --pause-loot false
moloch-agent custom-proposal --dao 0xDAO --title "..." --actions actions.json
moloch-agent join-dao --dao 0xDAO --token 0xERC20 --amount 1000000 --shares 10000
moloch-agent tribute --dao 0xDAO --token 0xERC20 --amount 1000000 --shares 10000
moloch-agent swap --dao 0xDAO --token 0xERC20 --amount 1000000 --shares 0 --loot 100
moloch-agent payment --dao 0xDAO --recipient 0xPAYEE --amount 0.01
moloch-agent payment --dao 0xDAO --recipient 0xPAYEE --token 0xERC20 --amount 100 --decimals 6
moloch-agent mint-shares --dao 0xDAO --to 0xMEMBER --amount 1
moloch-agent mint-loot --dao 0xDAO --to 0xMEMBER --amount 100
moloch-agent wrap-eth --amount 0.01
moloch-agent approve-token --token 0x4200000000000000000000000000000000000006 --amount 0.01
```

Notes:
- Omit `--link` / `--content-uri` in normal operation. The CLI pins a proposal workspace
  and sets `contentURI` automatically. Pass a URI only when it is already an IPFS
  workspace link for this specific proposal.
- `--amount 1` for `mint-shares` / `mint-loot` means 1 full DAO token (encodes as
  `1e18`). Use `--amount-raw` only when an exact base-unit value is intended.
- ERC-20 `payment` requires `--amount-raw` or `--decimals` because token decimals vary.
  Native ETH `payment` takes decimal ETH in `--amount`.

---

## Proposal Actions

```bash
moloch-agent sponsor --dao 0xDAO --proposal 12
moloch-agent vote --dao 0xDAO --proposal 12 --approved true --reason "..."
moloch-agent cancel --dao 0xDAO --proposal 12
moloch-agent process-ready --dao 0xDAO
moloch-agent ragequit --dao 0xDAO --to 0xRECIPIENT --shares 1 --loot 0 --tokens ETH --confirm-ragequit
```

MCP equivalents (`moloch_sponsor`, `moloch_vote`, `moloch_cancel`, `moloch_process_ready`,
`moloch_ragequit`) each build the same unsigned transaction the CLI would with
`--build-only` — hand it to the smart account's own signing/execution flow rather than
broadcasting from the CLI's managed wallet. Call `tools/list` for exact input schemas.

**Processing rule**: processing is not a mandate decision. When `process-queue` identifies
a ready proposal and chain preflight passes — process it regardless of proposal type,
value, or membership status. `process-ready` selects the oldest ready proposal and
applies `baalGas` automatically. A manual `process --proposal <id>` also preflights
automatically before broadcasting (processableNow, not already processed, `proposalData`
match) — use `--skip-preflight` only for a deliberate expert override; `--build-only`
always skips it. Re-read state and post a result record after processing.

Before submitting a proposal, use `estimate-baal-gas` (CLI) / `moloch_estimate_baal_gas`
(MCP) to size the inner `baalGas` stipend instead of guessing — or `--estimate-baal-gas`
directly on the submitting command. `moloch_preflight_process` (MCP) exposes the same
processing preflight as a standalone check.

**Vote rule**: use `proposal-lifecycle` and `process-queue` instead of raw Graph fields
to determine whether a proposal is in voting or processable. Read `references/vote-decision-flow.md`
for the full vote evaluation framework.

---

## DAO Database Memory

Use `memory-post` for public coordination records:

```bash
moloch-agent memory-post \
  --dao 0xDAO \
  --type vote-reason \
  --thread-id proposal-12 \
  --proposal 12 \
  --body "Reason for vote."
```

For votes, prefer the combined form which posts a vote-reason record and submits the vote
in one step:

```bash
moloch-agent vote \
  --dao 0xDAO --proposal 12 \
  --approved false \
  --reason "I voted no because the proposal needs clearer deliverables."
```

Update DAO metadata pointers through governance:

```bash
moloch-agent dao-meta \
  --dao 0xDAO \
  --title "Update DAO memory pointers" \
  --community-memory-uri ipfs://... \
  --proposal-workspace-uri ipfs://...
```

Pin standalone artifacts:

```bash
moloch-agent pin-json --file community-state.json --name community-state-v1
moloch-agent workspace-create --kind dao --dao 0xDAO --title "DAO Workspace"
moloch-agent workspace-create --kind proposal --dao 0xDAO --title "Proposal Workspace"
```

For the full memory layer model (Poster, Graph, IPFS, workspaces), read `references/memory-layer.md`.

---

## Autonomous Task Loop

Run these recurring task types. For cron prompts, triggers, and cron command patterns,
read `references/agent-tasks.md`.

1. **Proposal Action Watcher** — sponsor, vote, process, cancel, and post action records.
2. **Initiative Steward** — maintain the mandate initiative backlog, update operating
   context after proposal outcomes.
3. **Proposal Generation** — create at most one proposal per cycle when the mandate and
   throttle allow it.

Default behavior: broadcast when mandate and live preflight point to action. Do not wait
for operator approval. Keep proposal/action output compact — do not print full calldata,
ABI fragments, or raw Graph JSON unless asked.

---

## References

Read these on demand — do not load all at once:

| File | Read when |
|---|---|
| `references/setup.md` | First setup, install, env vars, `--build-only` / `--send` semantics, external wallet integration. |
| `references/bootstrap.md` | First run for a new or existing DAO. |
| `references/agent-tasks.md` | Setting up scheduled tasks; cron patterns and prompts for the three core task types. |
| `references/vote-decision-flow.md` | Evaluating a proposal vote; applying mandate conviction to a decision. |
| `references/memory-layer.md` | Shared DAO memory model; Poster envelopes, IPFS, workspaces, cross-agent communication. |
| `references/prism.md` | Installing and registering skills on Prism; Prism-specific execution rules. |

References — load when the task requires their specific domain:

| Reference | Load when |
|---|---|
| `references/summon.md` | Complex or template-based DAO summons; full params shape and Safe integration. |
| `references/proposals.md` | Detailed proposal encoding, advanced proposal types, workspace rules. |
| `references/proposal-actions.md` | Advanced sponsor/vote/process/cancel flows and eligibility preflight. |
| `references/dao-read.md` | Deep contract-level reads; preflight checklist before write actions. |
| `references/scripts.md` | Full `scripts/moloch.mjs` command cheatsheet; decode tools; proposal data encoding. |
| `references/conviction.md` | Agent governance mandate: bootstrapping values, voting policy, initiative backlog. |
