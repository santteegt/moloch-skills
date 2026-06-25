# Agent Bootstrap

Use this document when an agent is setting itself up for a DAO for the first time. This is not an experiment script and does not define the agent's mandate. The bootstrap step gathers the operator's intent, creates the first operating files, verifies dependencies, and starts the correct tasks.

## Terms

- **Conviction**: the agent's values, bias, and long-term orientation.
- **Mandate**: the concrete operating artifact the agent loads during tasks. It includes identity, voting policy, autonomy rules, initiative backlog, and execution policy.
- **Shared memory**: DAO-level public context using DAO database records plus IPFS-pinned artifacts.
- **Workspace**: an IPFS-pinned snapshot for the DAO or a proposal. Workspaces are linked from DAO metadata or proposal `contentURI`.

The `conviction.md` reference manages the mandate file format, but the agent should not invent the mandate during generic bootstrap. Ask the operator for the mandate or load it from the harness.

## Bootstrap Goal

The first run should answer these questions:

1. Which DAO is this agent operating in, or should it summon a new DAO?
2. Which wallet/account is the agent using?
3. Can the agent load an operator-provided mandate or mandate source?
4. Can the agent discover or create shared DAO memory?
5. Can the agent read chain state, Graph data, and DAO database records?
6. Can the agent pin IPFS artifacts when needed?
7. Which scheduled tasks should run?
8. Which platform skills are available for wallet/account management, Pinata/IPFS publishing, secrets, scheduler/tasks, and filesystem persistence?

## Operator Inputs

Resolve these from the harness/environment first. Ask the operator only for values that are missing and required for the immediate task.

Hard blockers for an existing DAO:

- DAO address.
- Mandate or mandate source path.
- Signing capability for write actions.

Hard blockers for a new summon:

- DAO name.
- Token symbols.
- Initial members and initial share/loot balances.
- Governance settings not supplied by a template.
- Mandate or mandate source path.
- Signing capability.

Discover without asking when possible:

- Agent name and wallet address from harness identity, `ACCOUNT_ADDRESS`, or wallet skill.
- Shared memory root from DAO metadata/records.
- Pinning provider from platform skills or hosted service capabilities.
- Scheduled task cadence from harness defaults.
- Available platform skills or harness capabilities.

If a required value is missing, create a local draft and record the missing field. Do not treat a draft mandate as ratified DAO truth.

## Dependency Check

Verify the runtime before autonomous work starts. See `setup.md` (same references folder)
for all environment variables, install steps, and execution modes.

```bash
# Primary: moloch-agent CLI + hosted service
moloch-agent health
moloch-agent capabilities

# Fallback: shared scripts (if moloch-agent CLI is unavailable)
node scripts/moloch.mjs capabilities
```

Then run an initial task snapshot once a DAO address is known:

```bash
node scripts/moloch.mjs task-snapshot \
  --dao 0xDAO --first 100 \
  --out-dir /data/custom/moloch-skills/artifacts/0xDAO
```

Required capabilities before autonomous write actions:

- `RPC_URL` configured and funded wallet available.
- Signing capability: platform wallet skill, managed signer, or `PRIVATE_KEY`.
  Use `moloch-agent account` to confirm the exact signer address.
- For `--build-only` / external wallet integration, see `setup.md`.

Required for indexed discovery: `GRAPH_URL` or `GRAPH_API_KEY`.

Required for publishing versioned artifacts: Pinata/IPFS via the hosted service
(`moloch-agent pin-json`) or a platform IPFS skill if available.

Also record whether the harness provides: scheduler/tasks, secrets management,
filesystem persistence, and operator notification skills.

## Mandate Setup

Use the template only after the operator provides the mandate content or source:

```text
assets/conviction-profile.template.json
```

Fill the mandate with:

- identity
- DAO address
- wallet address
- conviction values
- voting policy
- sponsorship policy
- initiative backlog
- autonomous execution policy
- audit/posting behavior

Recommended storage:

```text
/data/custom/moloch-skills/profiles/<dao>-<agent>-mandate.json
```

The mandate should stay small. It should not contain private keys, raw proposal data, large histories, or transient local cache.

If the mandate should be public, pin it or post a pointer through DAO database memory. If the DAO should ratify it, submit a signal proposal that links the mandate URI.

## DAO Setup

If the DAO already exists:

1. Read `daoProfile`.
2. Read `communityMemory`, `signal`, and relevant DAO database records.
3. Find `communityMemoryURI`, `proposalWorkspaceURI`, and `sharedStateURI`.
4. Fetch the current `community-state.md` if available.
5. Run `task-snapshot`.

If the agent is explicitly asked to summon:

1. Prepare summon params from operator-provided DAO intent.
2. Let the CLI/service create and pin the starter DAO workspace when memory pointers are omitted.
3. Include any operator-provided memory pointers in summon metadata.
4. Use only full addresses from authoritative sources. Never expand a shortened preview like `0x1234...abcd`. If the signer is a founder, run `moloch-agent account` and copy the returned full `address` exactly.
5. Summon the DAO.
6. Run `task-snapshot`.
7. Post a `communityMemory` thread-root announcing the bootstrap state when the agent is a DAO member.

If CIDs are not ready before summon, summon without them and immediately prepare a `dao-meta` proposal to publish the pointers.

## Shared Memory Rule

Local files are scratch. Shared knowledge should be published.

- Short public coordination: DAO database records with `memory-post`.
- Larger/versioned artifacts: IPFS, then link the CID from DAO database records or proposal `contentURI`.
- Governance execution truth: direct chain reads.
- Indexed discovery: The Graph.

Use the `community-memory/v1` envelope for DAO database records. Prefer `threadId` as the grouping key.

## First Scheduled Tasks

After bootstrap, configure recurring tasks using the patterns in `agent-tasks.md`
(same references folder). The three core tasks are the Proposal Action Watcher,
Initiative Steward, and Proposal Generation cycle.

## Bootstrap Output

At the end of bootstrap, produce a compact operator-facing summary:

- DAO address or summon tx hash.
- Agent wallet address.
- Mandate path or mandate URI.
- Shared memory pointers found or created.
- Dependency status: RPC, Graph, signer, pinning.
- Scheduled tasks configured.
- Missing fields or blocked capabilities.
