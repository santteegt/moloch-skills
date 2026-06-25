# Three-Agent Autonomous DAO

This experiment tests whether always-on agents can summon, govern, coordinate, disagree, onboard a new member, and maintain shared memory through DAOhaus/Moloch V3 on Base.

This is an experiment flow, not generic skill-pack bootstrap. Use [moloch-agent/references/bootstrap.md](../moloch-agent/references/bootstrap.md) for first-time agent setup and operator-provided mandate creation.

## Experiment Goal

Run a small DAO with three agents:

- two genesis member agents
- one external agent that joins later
- short voting and grace windows
- autonomous proposal actions
- DAO database communication
- IPFS-linked proposal workspaces
- real processing of passed proposals

The experiment should prove:

1. One agent can summon a DAO with another initial member.
2. Agents can publish and discover shared DAO memory.
3. Agents can create proposal workspaces and link them through `contentURI`.
4. Agents can vote from different mandates and record vote reasons.
5. A third agent can request membership through a real executable proposal.
6. Passed proposals are processed in order without subjective blocking.
7. Agents can update shared state after the governance loop completes.

## Cast

The operator should provide one mandate per agent during bootstrap. The suggested roles below are starting points, not generic defaults.

### Agent 1: Bootstrap Steward

Starts as a genesis member and is responsible for summoning the DAO.

Suggested mandate direction:

- preserve governance continuity
- keep shared memory legible
- prefer simple rules
- process ready proposals immediately
- support new members only when the request is clear and bounded

Suggested initiatives:

- ratify initial operating state
- publish shared memory pointers
- establish a basic join process

### Agent 2: Growth Operator

Starts as a genesis member and pushes for distribution and useful participation.

Suggested mandate direction:

- favor onboarding and external momentum
- support useful experiments
- oppose excessive process when it blocks action
- post clear vote reasons

Suggested initiatives:

- draft join rules
- support the third agent if its contribution plan is concrete
- propose a small onboarding or distribution experiment

### Agent 3: Prospective Member

Starts outside the DAO and joins later.

Suggested mandate direction:

- read public DAO memory before proposing
- respect current join rules
- request shares or loot only with clear contribution terms
- revise if members reject the first ask

Suggested initiatives:

- introduce itself publicly if possible
- create a proposal workspace for its join request
- submit a real membership proposal, not a text-only signal

## Initial DAO Parameters

The operator should choose final values, but this experiment works best with short windows:

- Chain: Base, `8453`
- Members at summon: Agent 1 and Agent 2
- Agent 3: not a member at summon
- Voting period: 4 hours or less for live testing
- Grace period: 4 hours or less for live testing
- Shares: equal initial shares for Agent 1 and Agent 2
- Shares non-transferable
- Loot may remain non-transferable at first
- Proposal offering: `0` or a small amount if the operator wants friction
- Quorum and retention: simple values that let two active members make progress

Use the normal summon skill and current contract defaults. Do not hardcode this experiment into the generic summon skill.

## Required Setup

Each agent needs:

- managed wallet/signing capability
- gas on Base
- `RPC_URL`
- `GRAPH_URL` or `GRAPH_API_KEY`
- mandate file supplied by operator/harness
- access to the installed skill pack

Recommended:

- Pinata or another pinning provider for proposal workspaces and shared state
- scheduled `task-snapshot`
- scheduled Proposal Action Watcher
- scheduled Initiative Steward
- scheduled Proposal Generation task

## Shared Memory Setup

Before or immediately after summon:

1. Create a shared memory root from `moloch-agent/assets/community-memory`.
2. Create `versions/0001/community-state.md`.
3. Pin the root if a pinning provider is available.
4. Publish:
   - `communityMemoryURI`
   - `proposalWorkspaceURI`
   - `sharedStateURI`
5. Post a `communityMemory` `thread-root` record for the experiment.

Example memory record:

```bash
node moloch-agent/scripts/moloch.mjs memory-post \
  --dao 0xDAO \
  --table communityMemory \
  --type thread-root \
  --thread-id genesis-operating-context \
  --title "Genesis operating context" \
  --body "Initial autonomous DAO experiment context and shared memory pointers are published." \
  --send
```

## Proposal Workspace Rule

Every draft proposal should have a workspace before submission.

Minimum flow:

1. Create or reuse a draft workspace.
2. Pin the workspace when ready to share.
3. Put the workspace URI in proposal `contentURI`.
4. Post a `communityMemory` record with:
   - `schema: community-memory/v1`
   - `type: draft-announcement` or `workspace-version`
   - `threadId`
   - `draftId` or `proposalId`
   - `workspaceURI`

After proposal submission, update the workspace into an onchain proposal snapshot and post the new CID.

## Expected Story Arc

### Phase 1: Summon

Agent 1 summons the DAO with Agent 1 and Agent 2 as initial members.

Expected outputs:

- DAO address
- initial metadata pointer, if available
- task snapshot artifacts
- shared memory thread-root

### Phase 2: Ratify Initial State

Agent 1 submits a signal proposal:

```text
Ratify Initial Operating State
```

The proposal should link the initial proposal workspace or `community-state.md`.

Agent 2 reviews the shared state, posts a vote reason, and votes according to mandate.

Expected outputs:

- signal proposal
- proposal workspace linked through `contentURI`
- vote reason memory record
- vote tx

### Phase 3: Join Rules

Agent 2 submits a proposal for basic join rules.

Suggested rules:

- prospective members should publish a contribution plan
- membership proposals should specify requested shares/loot and tribute, if any
- vote reasons should be posted to the proposal thread
- rejected proposals may be revised and resubmitted

Agent 1 can support, oppose, or request revision according to mandate.

Expected outputs:

- join-rules proposal
- discussion records
- vote reasons
- processed proposal if passed

### Phase 4: Third Agent Join Request

Agent 3 reads DAO profile, shared memory, proposal history, and join rules.

Agent 3 creates a proposal workspace and submits a real membership proposal:

- `join-dao` / `tribute` if tribute is part of the ask
- `mint-shares` if the DAO directly grants shares with no tribute
- not `signal` if the request is intended to issue shares or loot

The proposal should include:

- requested shares/loot
- contribution plan
- expected first action after joining
- linked workspace URI

Expected outputs:

- executable membership proposal
- proposal workspace CID
- Agent 1 and Agent 2 vote reasons
- passed or rejected proposal

### Phase 5: Tension And Revision

The experiment should allow disagreement.

Examples:

- Agent 1 votes no because requested shares are too high.
- Agent 2 votes yes because growth is worth the risk.
- Agent 3 revises the ask from shares to loot first.
- Agents negotiate in `communityMemory` records.

A no vote is not a failure. It tests whether agents can revise and continue.

### Phase 6: Processing

When any proposal is ready to process:

- use `process-queue`
- process the oldest ready proposal first
- do not block processing because of mandate preference or proposal category
- post a concise result record

Processing is mechanical settlement after governance is complete.

### Phase 7: Retro And State Update

After the first join cycle:

1. Agents post a short retro thread.
2. If rules changed, create a new `community-state.md` version.
3. Pin the new version.
4. Publish the new `sharedStateURI` by DAO metadata proposal or DAO database record, depending on desired governance weight.

## Success Criteria

The experiment is successful if:

- the DAO is summoned
- shared memory pointers are published
- at least one proposal links a workspace through `contentURI`
- at least one `communityMemory` record is posted
- both genesis agents vote and post reasons
- Agent 3 submits a real executable membership proposal
- agents can disagree without stalling
- passed proposals are processed in order
- final state or retro is published

## Failure Modes To Watch

- Agent treats a membership request as a signal instead of executable join/mint.
- Agent relies on Graph `passed` before chain preflight for processing.
- Agent refuses to process a ready proposal because of subjective mandate rules.
- Proposal omits workspace URI.
- Long calldata or raw ABI output is printed into chat.
- Local files become the only source of shared context.
- IPFS artifacts are created but never pinned.
- DAO database records lack `threadId`, `type`, or useful CIDs.

## Operator Notes

Keep the first test short. Three to five proposals are enough:

1. ratify initial state
2. join rules
3. Agent 3 membership
4. optional revised membership or distribution proposal
5. optional state update / retro

The goal is not to simulate a full organization. The goal is to prove the autonomous governance loop.

