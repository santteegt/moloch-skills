# Setup Reference

This is the single canonical reference for tooling hierarchy, install steps, environment
variables, and transaction execution modes for the moloch-skills bundle.

---

## Tooling hierarchy

**Primary:** the `moloch-agent` npm CLI backed by the hosted moloch service.
Use it for all standard DAO operations — it handles Graph reads, IPFS pinning, and
proposal workspace creation automatically.

**Fallback:** `scripts/moloch.mjs`.
Use it only when:
- the `moloch-agent` CLI is unavailable or not installed, or
- a specific command is not yet exposed by `moloch-agent`.

Every command example in the skill docs marks which toolchain it uses. Do not mix flags
between them — they have inverted execution defaults (see [Transaction execution modes](#transaction-execution-modes)).

---

## Install

### moloch-agent CLI (primary)

```bash
npm install -g @raidguild/meta-clawtel
moloch-agent --help
moloch-agent health
moloch-agent capabilities
```

The CLI connects to the hosted moloch service for Graph reads and IPFS pinning.
It never sends private keys to the service — signing stays local.

### moloch-agent scripts (fallback)

```bash
cd /data/custom/moloch-skills/moloch-agent
npm install
node scripts/moloch.mjs --help
node scripts/moloch.mjs capabilities
```

For Prism, use `/data/custom/moloch-skills/moloch-agent` as the script root. For local dev,
use the repo checkout path. Do not reference the scripts by relative path in
harness-managed skill definitions; use the absolute path.

---

## Environment variables

### For indexed reads (Graph)

| Variable | Required | Notes |
|---|---|---|
| `GRAPH_API_KEY` | One of these two | API key for The Graph Gateway. |
| `GRAPH_URL` | One of these two | Full subgraph URL; overrides `GRAPH_API_KEY`. |

The Base DAOhaus subgraph URL pattern (see `config/networks.json`):
```
https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/7yh4eHJ4qpHEiLPAk9BXhL5YgYrTrRE6gWy8x4oHyAqW
```

Both `moloch-agent` and the scripts accept `--graph-url` / `--graph-key` as
per-command overrides for the same variables.

### For direct chain reads and write operations

| Variable | Required | Notes |
|---|---|---|
| `RPC_URL` | Yes for writes; optional for reads | `moloch-agent` falls back to `https://mainnet.base.org` for light reads. `moloch.mjs` gracefully degrades to Graph-only reads when absent. Use Alchemy, Infura, or another dedicated provider for always-on agents. |
| `PRIVATE_KEY` | Yes for `moloch-agent` broadcast; Yes for `moloch.mjs --send` | Never log, commit, or paste. For external wallet integration, omit `PRIVATE_KEY` and use `--build-only` / no `--send` instead (see below). |

### For the hosted moloch service

| Variable | Required | Notes |
|---|---|---|
| `MOLOCH_SERVICE_URL` | No | Defaults to `https://moloch-service-production.up.railway.app`. Override only when self-hosting the moloch service. |

### Network and behavior

| Variable | Required | Notes |
|---|---|---|
| `CHAIN_ID` | No | Defaults to `8453` (Base). Change only when operating on a different supported chain. |
| `IPFS_GATEWAY_URL` | No | When set, `moloch-agent` proposal commands use gateway URLs in `contentURI` instead of `ipfs://` URIs. Leave unset unless the target platform requires HTTP gateway links. |
| `MOLOCH_SEND_DEFAULT` | No | `moloch-agent` only. Set to `false` to make all transaction commands build-only by default. Useful for agent environments where external wallet integration is the norm. |
| `MOLOCH_WAIT_DEFAULT` | No | Fallback wait-for-receipt default for the shared scripts. Prefer the per-command flags `--wait`, `--no-wait`, and `--confirmations N`. |

### 1Password CLI (optional)

Use `--vault-provider 1password --vault-item "<item>" --vault-field private_key` with `--send`
to load `PRIVATE_KEY` from 1Password CLI without exporting it into the shell environment.

---

## Transaction execution modes

The two toolchains have **inverted** execution defaults. Apply the right flag for the
right tool — they are not interchangeable.

### moloch-agent CLI

| Intent | Flag / behavior |
|---|---|
| Broadcast (default) | No flag needed. The CLI signs with `PRIVATE_KEY` and broadcasts. |
| Dry run / unsigned tx JSON | `--build-only` |

Use `--build-only` when:
- you want to review the unsigned transaction before sending, or
- the agent integrates with **external wallet infrastructure** — a platform wallet skill,
  Turnkey-backed custody, hardware wallet, multi-sig relay, or any signer that is not
  a raw `PRIVATE_KEY`. The CLI produces `{ to, value, data, chainId }` JSON that the
  external signer can consume.

`MOLOCH_SEND_DEFAULT=false` makes `--build-only` the default for all commands in the
current environment, useful when an external signer is always in the loop.

### moloch-agent scripts (`moloch.mjs`)

| Intent | Flag / behavior |
|---|---|
| Dry run / unsigned tx JSON (default) | No flag needed. Outputs `{ to, value, data, chainId }`. |
| Broadcast | `--send` |

Use without `--send` when building unsigned transactions for external signing, reviewing
before broadcast, or in explicit draft/review/dry-run mode.

### Receipt waiting

Both toolchains wait for transaction receipts by default to prevent stale nonce races
in back-to-back writes (e.g. sponsor then vote).

| Flag | Effect |
|---|---|
| `--wait` | Explicit wait for receipt (default behavior). |
| `--confirmations N` | Wait for N confirmations. |
| `--no-wait` | Fire-and-forget; use only for single isolated writes where nonce ordering is not a concern. |

---

## Capability check

Always run a capability check before the first autonomous task:

```bash
# Primary (moloch-agent CLI)
moloch-agent health
moloch-agent capabilities

# Fallback (shared scripts)
node /data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs capabilities
```

Expected from `moloch-agent capabilities`:
- `graph.configured: true` — hosted service has Graph access.
- `pinning.configured: true` — hosted service has Pinata/IPFS access.
- `signing.handledByService: false` — signing always stays local.

Expected from `moloch.mjs capabilities`:
- `configured.rpc: true` — if `RPC_URL` is set.
- `configured.graph: true` — if `GRAPH_API_KEY` or `GRAPH_URL` is set.
- `configured.privateKey: true` — if `PRIVATE_KEY` is set.

If `tribute`, `join-dao`, or `mint-shares` is missing from `moloch.mjs --help` or
`capabilities`, the local bundle is stale. Re-install from
`https://github.com/HausDAO/moloch-skills`.

---

## Network config and contract addresses

Contract addresses, the DAOhaus subgraph ID, and Poster tags live in one place:

```
moloch-agent/config/networks.json
```

Look up a specific address:

```bash
node scripts/network-config.mjs --key TRIBUTE_MINION
node scripts/network-config.mjs --key V3_FACTORY_ADV_TOKEN
node scripts/network-config.mjs --contracts   # full contracts map
node scripts/network-config.mjs               # full Base config
```

The script defaults to chain `8453` (Base). Pass `--chain <chainId>` for other networks
once added to the config.

Do not hardcode contract addresses in skill files or agent prompts. Always look them up
from the config when you need them.
