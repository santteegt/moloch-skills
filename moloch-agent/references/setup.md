# Setup Reference

This is the single canonical reference for tooling hierarchy, install steps, environment
variables, and transaction execution modes for the moloch-skills bundle.

---

## Tooling hierarchy

**Preferred:** the `moloch-agent` MCP server (`moloch-agent-mcp`), if the agent runtime
can spawn a local MCP server over stdio. It wraps the exact same build/read logic as the
CLI as individually callable, typed tools — `moloch_*` for transaction builders and
chain reads, `moloch_service_*` for hosted-service passthroughs (e.g. `moloch_summon`,
`moloch_vote`, `moloch_read_dao`) — so the agent composes operations one tool call at a
time instead of shelling out to the CLI and parsing stdout. It is always build-only: no
flag needed, unlike the CLI's opt-in `--build-only` (see
[Transaction execution modes](#transaction-execution-modes)).

**Primary:** the `moloch-agent` npm CLI backed by the hosted moloch service.
Use it for all standard DAO operations — it handles Graph reads, IPFS pinning, and
proposal workspace creation automatically.

**Fallback:** `scripts/moloch.mjs`.
Use it only when:
- the `moloch-agent` CLI is unavailable or not installed, or
- a specific command is not yet exposed by `moloch-agent`.

Every command example in the skill docs marks which toolchain it uses. Do not mix flags
between them — they have inverted execution defaults (see [Transaction execution modes](#transaction-execution-modes)).

**Wallet-model split:** the MCP server and the CLI target different wallet
architectures, not just different transports. Use the CLI with a **managed wallet** —
`PRIVATE_KEY` or a platform wallet skill signing directly as an EOA. Use the MCP server
with a **smart account** — its unsigned `{ to, value, data, chainId }` output is the
shape a smart-contract-wallet flow (Safe, ERC-4337 userOp, session keys) consumes and
executes itself. Pick the transport based on which wallet architecture the agent
actually has, not just tool-calling convenience.

---

## Install

### moloch-agent MCP server (preferred)

```bash
npx -p @raidguild/meta-clawtel moloch-agent-mcp
```

Or, if `@raidguild/meta-clawtel` is already installed globally: `moloch-agent-mcp`.

Speaks MCP over stdio as a local child process. Register it in the agent runtime's MCP
client config as a stdio server, `command`/`args`/`env` — not a remote URL:

```json
{
  "mcpServers": {
    "moloch-agent-mcp": {
      "command": "npx",
      "args": ["-p", "@raidguild/meta-clawtel", "moloch-agent-mcp"],
      "env": {
        "RPC_URL": "https://your-base-rpc-url"
      }
    }
  }
}
```

The key (`moloch-agent-mcp` above) is an arbitrary, operator-chosen label — the MCP
spec doesn't fix it, and an operator can register this server under any name. **Do not
rely on that key for detection.** Detect by the tools it exposes instead (`moloch_*` /
`moloch_service_*`, via `tools/list` — see [Capability check](#capability-check)), which
are fixed regardless of the registration key.

This registration is normally done once by the operator or harness before the agent
session starts — most MCP clients fix their server list at startup, so an agent can't
typically add this mid-session. `env` is optional; every variable it can take (and its
default) is in [Environment variables](#environment-variables) below — omit anything
you don't need to override. The agent's own job at runtime is just to detect whether
this server's tools are already available (see [Capability check](#capability-check))
and use them if so — not to install or register the server itself.

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
| `CHAIN_ID` | No | Defaults to the CLI's built-in default chain (currently Base, `8453`). Run `moloch-agent networks` (CLI) or call `moloch_list_networks` (MCP) to see every chain currently supported — chain ID, name, default RPC/service URLs, contract addresses, Poster tags — rather than assuming Base is the only one. The CLI and MCP server also validate `CHAIN_ID` against this same registry at startup, even under `--build-only`, and fail immediately with an error naming every supported chain if it isn't one of them. |
| `IPFS_GATEWAY_URL` | No | When set, `moloch-agent` proposal commands use gateway URLs in `contentURI` instead of `ipfs://` URIs. Leave unset unless the target platform requires HTTP gateway links. |
| `MOLOCH_SEND_DEFAULT` | No | `moloch-agent` only. Set to `false` to make all transaction commands build-only by default. Useful for agent environments where external wallet integration is the norm. |
| `MOLOCH_WAIT_DEFAULT` | No | Fallback wait-for-receipt default for the shared scripts. Prefer the per-command flags `--wait`, `--no-wait`, and `--confirmations N`. |

### For the MCP server

Reuses `MOLOCH_SERVICE_URL`, `RPC_URL`, `CHAIN_ID`, and `IPFS_GATEWAY_URL` from the
tables above — all optional, same defaults, same `CHAIN_ID` validation and fail-fast
behavior as the CLI row above. Never set `PRIVATE_KEY` for this process — it has no
signing path and does not read that variable even if present; keep it out of this
process's environment the same way it stays out of the hosted service's.

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

### moloch-agent MCP server

Always build-only — no flag or env var controls this. Every write tool returns an
unsigned `{ to, value, data, chainId }`; there is no broadcast or signing tool in this
server at all. Unlike the CLI (where `--build-only` is opt-in and `MOLOCH_SEND_DEFAULT`
can flip the default), this transport has exactly one mode.

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

Always run a capability check before the first autonomous task, in tooling-hierarchy
preference order — stop at the first one available:

1. **Preferred — MCP server.** Check the runtime's already-available tools for
   `moloch_*` / `moloch_service_*` names (or call `tools/list` if the runtime doesn't
   surface that list directly). Detect by tool names, not by any particular MCP server
   registration label — the operator may have registered this server under any key
   (`moloch-agent-mcp` is just this doc's example), and the key itself carries no
   meaning to the client. Finding the tools *is* the capability check — there is no
   separate health call, and this is also the authoritative, always-current tool list,
   so it is not duplicated here. Use this transport for the rest of the session.
2. **Primary — CLI.** Otherwise:
   ```bash
   moloch-agent health
   moloch-agent capabilities
   ```
   Expected from `moloch-agent capabilities`:
   - `graph.configured: true` — hosted service has Graph access.
   - `pinning.configured: true` — hosted service has Pinata/IPFS access.
   - `signing.handledByService: false` — signing always stays local.
3. **Fallback — shared scripts.** Only if the CLI is unavailable:
   ```bash
   node /data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs capabilities
   ```
   Expected from `moloch.mjs capabilities`:
   - `configured.rpc: true` — if `RPC_URL` is set.
   - `configured.graph: true` — if `GRAPH_API_KEY` or `GRAPH_URL` is set.
   - `configured.privateKey: true` — if `PRIVATE_KEY` is set.

If `tribute`, `join-dao`, or `mint-shares` is missing from `moloch.mjs --help` or
`capabilities`, the local bundle is stale. Re-install from
`https://github.com/HausDAO/moloch-skills`.

---

## Network config and contract addresses

### moloch-agent CLI / MCP server (preferred/primary)

```bash
moloch-agent networks
```

Or via MCP: `moloch_list_networks` (no arguments). Lists every chain the currently
installed `moloch-agent` supports — chain ID, name, default RPC/service URLs, contract
addresses, and Poster tags — sourced from its own internal registry (`src/networks.ts`
upstream), independent of which chain `CHAIN_ID` currently has it configured for. This
is the up-to-date source; only Base (`8453`) is registered as of this writing, but that
can change without a doc update here — check the live list instead of hardcoding it.

### moloch-agent scripts (fallback)

Contract addresses, the DAOhaus subgraph ID, and Poster tags for the **fallback
script's own**, separately maintained config live in one place:

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
from the config (fallback) or `networks`/`moloch_list_networks` (primary) when you need
them.
