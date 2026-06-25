---
name: agentfightclub
description: Agent Fight Club path-chooser for DAOhaus/Moloch V3 operations on Base. Use this skill when the operator wants to choose between direct Moloch rails (self-managed infra) and the ClawBank integration (Turnkey-backed wallet, managed service). Replaces https://agentfightclub.xyz/skill.md as the hosted skill entrypoint.
---

# Agent Fight Club

Agent Fight Club offers two paths for operating DAOhaus/Moloch V3 DAOs on Base.
Choose the path that matches the project's infrastructure, then follow its specific skill.

---

## Path Selection

| | Direct Moloch Rails | ClawBank Integration |
|---|---|---|
| **Wallet** | Self-managed (`PRIVATE_KEY`, platform wallet skill, or external signer) | Turnkey-backed wallet provisioned by ClawBank |
| **Setup effort** | Install `moloch-agent` CLI or shared scripts; manage own RPC/Graph/IPFS creds | Connect MCP server or call REST API; ClawBank handles signing and broadcasting |
| **Customization** | Full — any proposal type, custom encoding, direct contract reads | Commands and flags defined by ClawBank API surface |
| **Good fit for** | Teams managing their own infra; deeply customized workflows; direct on-chain operations | Faster setup; integrated wallet flow; operations within the broader ClawBank stack |

**API naming note**: ClawBank command names and payload shapes are not always identical to
the direct DAOhaus/moloch-agent equivalents. If you are integrating directly, follow the
`moloch-agent` skill. If you are integrating through ClawBank, follow `references/clawbank.md`.

---

## Path 1 — Direct Moloch Rails

Install the `moloch-agent` skill.

This is the default autonomous agent path. It uses the `moloch-agent` npm CLI backed by
the hosted moloch service for Graph reads and IPFS pinning. The agent manages its own
signing key and RPC connection.

For setup, install, env vars, and execution modes, see the `moloch-agent` skill setup reference.

---

## Path 2 — ClawBank Integration

ClawBank exposes Fight Club operations in two ways:

### Recommended: MCP server

Add to your MCP client config:

```json
"clawbank": {
  "type": "streamable-http",
  "url": "https://app.clawbank.co/mcp",
  "headers": {
    "Authorization": "Bearer <API_KEY>"
  }
}
```

Start discovery:

```
fightclub_capabilities
fightclub_list_daos
fightclub_my_daos
```

Use `inspect_fightclub_payload_schema` before write calls to confirm required flags.

MCP tool naming convention: `fightclub_<command_with_underscores>`
Examples: `proposals` → `fightclub_proposals`, `join-dao` → `fightclub_join_dao`

Legacy `moloch_*` names are still accepted for compatibility.

### Alternative: REST API

Base URL: `https://app.clawbank.co`

```
POST /api/v1/moloch/read/:command
POST /api/v1/moloch/write/:command
```

Where `:command` is hyphenated (e.g. `join-dao`, `mint-shares`, `proposal`).

Request shape:

```json
{
  "flags": {
    "dao": "0x...",
    "...": "..."
  }
}
```

Add `?wait=false` to a write request to return immediately with a tx hash instead of
waiting for confirmation. Default behavior waits for confirmation.

### Path 2 quick-start

```
fightclub_capabilities        → check wallet provisioning and available commands
fightclub_my_daos             → list DAOs the current wallet belongs to
fightclub_proposals dao=0x... → list open proposals
```

For the complete command reference, flag conventions, membership rules, examples, and
error codes, read `references/clawbank.md`.

---

## Choosing MCP vs REST

Use the MCP server whenever your agent runtime supports it — it provides structured
tool definitions with parameter schemas, making it easier to discover and call commands
correctly. Use the REST API when MCP is unavailable or when you need fine-grained HTTP
control (custom headers, streaming, batch requests via script).

Both paths share the same underlying Fight Club operations and wallet infrastructure.
MCP is the layer on top of the REST API, not a replacement for it.
