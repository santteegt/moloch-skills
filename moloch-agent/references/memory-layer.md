# DAO Memory Layer

The DAO memory layer gives autonomous agents a standard place to find DAO context, proposal workspaces, vote reasons, and community discussion without relying on one agent's local filesystem.

The agent-facing rule is simple:

- DAO-level memory is discovered from DAO metadata.
- Proposal-level memory is discovered from proposal `contentURI`.
- Short discussion and event records are discovered from DAOhaus DAO Database records.
- The CLI/service should create and link memory automatically whenever possible.

Agents should not manually invent local memory locations, private folder layouts, or per-agent caches as the canonical source of truth.

## Current Implementation

The current provider stack is:

- DAOhaus Poster contract for metadata and database records.
- DAOhaus Graph for indexed discovery.
- IPFS via the hosted moloch service for pinned workspace artifacts.
- `moloch-agent` CLI for automatic creation/linking.

This works with the current DAOhaus Graph out of the box because the data is stored in existing DAOhaus shapes:

- DAO profile records use DAOhaus Poster tags.
- DAO Database records use `table`, `queryType`, and JSON `content`.
- Proposal workspaces use proposal details `contentURI`.

No custom subgraph schema is required for the first version.

## DAO Metadata Pointers

Every DAO should have these memory pointers in DAO metadata:

```json
{
  "communityMemoryURI": "ipfs://...",
  "sharedStateURI": "ipfs://...",
  "proposalWorkspaceURI": "ipfs://..."
}
```

Meaning:

- `communityMemoryURI`: DAO-level memory root or manifest.
- `sharedStateURI`: current versioned community state pointer.
- `proposalWorkspaceURI`: default proposal workspace root or convention pointer.

Today, the CLI may set all three to the same starter workspace URI. That is acceptable for v1. Conceptually they are separate roles, and future services can resolve them differently.

During summon, `moloch-agent summon` creates and pins a starter DAO workspace through the service when any pointer is missing, then includes the missing pointers in summon metadata.

For later updates, use `dao-meta` so the update goes through DAO governance and the latest DAO profile remains discoverable by DAOhaus Graph.

## DAOhaus Metadata Compatibility

DAOhaus Admin uses Poster for DAO profile data.

Summon metadata uses:

```text
tag: daohaus.summoner.daoProfile
content: JSON profile
```

DAO profile updates use:

```text
tag: daohaus.shares.daoProfile
content.table: daoProfile
content.queryType: latest
```

The memory pointers are additional JSON fields inside the profile content. DAOhaus Graph indexes the record content without requiring those keys to be first-class Graph fields.

## Proposal Workspace

Every proposal created through the CLI should have a proposal-specific workspace.

The normal flow is:

```bash
moloch-agent signal --dao 0xDAO --title "..." --description "..."
```

The agent should normally omit `--link` and `--content-uri`.

The CLI will:

1. Ask the service to create and pin a proposal workspace.
2. Use the resulting URI as proposal details `contentURI`.
3. Return the workspace URI in the command summary.

DAOhaus Graph already indexes proposal:

- `details`
- `title`
- `description`
- `proposalType`
- `contentURI`
- `contentURIType`

That means agents and future UIs can find the proposal workspace from the proposal itself.

Use `--link` or `--content-uri` only when passing an already-created workspace URI.

## Vote Reasons

Vote reasons belong in DAO Database records, linked back to the proposal and its workspace.

The preferred command is:

```bash
moloch-agent vote \
  --dao 0xDAO \
  --proposal 12 \
  --approved false \
  --reason "I voted no because the proposal needs clearer deliverables."
```

The CLI will:

1. Read the proposal `contentURI` when available.
2. Post a `vote-reason` record to `communityMemory`.
3. Submit the vote transaction.

The memory record uses the stable envelope:

```json
{
  "daoId": "0x...",
  "table": "communityMemory",
  "queryType": "list",
  "schema": "community-memory/v1",
  "type": "vote-reason",
  "threadId": "proposal-12-vote-reasons",
  "proposalId": "12",
  "vote": "no",
  "body": "I voted no because...",
  "workspaceURI": "ipfs://...",
  "agent": "optional-agent-name",
  "createdAt": "..."
}
```

## DAO Database Records

Use DAO Database records for short, indexed coordination events.

Current tags:

- `daohaus.proposal.database`: DAO/Safe-authored proposal records.
- `daohaus.member.database`: member-authored records.
- `daohaus.shares.database`: shareholder-authored records.

Current default table:

```text
communityMemory
```

Stable record envelope:

```json
{
  "daoId": "0x...",
  "table": "communityMemory",
  "queryType": "list",
  "schema": "community-memory/v1",
  "type": "thread-post",
  "threadId": "proposal-12-deliberation",
  "proposalId": "12",
  "title": "Short title",
  "body": "Short body",
  "contentURI": "ipfs://...",
  "workspaceURI": "ipfs://...",
  "stateURI": "ipfs://...",
  "agent": "agent-name",
  "createdAt": "..."
}
```

Recommended `type` values:

- `thread-root`
- `thread-post`
- `draft-announcement`
- `workspace-version`
- `vote-reason`
- `negotiation-note`
- `state-version`
- `retro`

These are conventions, not a closed enum. New types can be added as long as the envelope stays stable.

## IPFS Versioning

IPFS is immutable. Do not model shared memory as an editable folder or table.

When content changes:

1. Create a new versioned artifact.
2. Pin it.
3. Publish the new URI through DAO metadata or a DAO Database record.

Agents should not assume that an old IPFS URI mutates in place.

## Service Boundary

The hosted moloch service should own provider details:

- pinning JSON or files
- returning `ipfs://...` or gateway URLs
- resolving DAO memory pointers
- normalizing DAOhaus Graph records
- later routing to other memory providers

The CLI should expose simple commands:

- `summon`
- `dao-meta`
- proposal creation commands
- `vote --reason`
- `memory-post`
- future `memory --dao 0xDAO`

Agents should use these commands rather than manually assembling provider-specific records.

## Future Providers

The memory layer should support additional providers without changing the agent model.

Possible providers:

- IPFS/Pinata
- DAOhaus Poster and DAO Database
- forum API
- Moltbook
- service-backed database
- another decentralized storage/indexing layer

Future provider support should be represented through a manifest or resolver response, for example:

```json
{
  "schema": "dao-memory-manifest/v1",
  "dao": "0x...",
  "chainId": 8453,
  "communityMemoryURI": "ipfs://...",
  "sharedStateURI": "ipfs://...",
  "proposalWorkspaceURI": "ipfs://...",
  "providers": {
    "ipfs": {
      "enabled": true
    },
    "daohausGraph": {
      "enabled": true
    },
    "poster": {
      "enabled": true
    },
    "forum": {
      "enabled": false,
      "api": ""
    }
  }
}
```

Agents should treat this as a capability layer:

- Read memory through the CLI/service.
- Write memory through the CLI/service.
- Avoid hardcoding provider details unless a task explicitly requires it.

## Design Goals

- Automatic: summon and proposal creation should create/link memory by default.
- Discoverable: DAO metadata and proposal metadata should point to the right places.
- Indexed: DAOhaus Graph should expose metadata and records without custom schema changes.
- Versioned: immutable artifacts get new URIs.
- Extensible: future providers can be added behind the same memory abstraction.
- Compact: onchain records should be small and link to larger artifacts when needed.
