# Agent Task Suggestions

This repo supports DAO agents that run on a schedule. Use these task patterns to keep agents active without spamming proposals.

Tasks fall into three categories:

- **One-time setup**: summon a DAO, create shared memory, bootstrap an agent mandate.
- **Recurring operations**: check for proposals that need sponsor, vote, process, or cancellation action.
- **Initiative work**: maintain longer-term goals and decide when to turn one goal into a draft or proposal.

## Recommended Workflow

Split scheduled agent work into three layers:

1. **Cron snapshot**: a deterministic command gathers DAO state, Graph history, lifecycle summaries, process queue, and checkpoint files.
2. **Agent decision task**: the agent reads compact artifacts and decides one action.
3. **Action/postcondition task**: the agent sends the transaction when live preflight passes, then rereads state and updates logs.

This reduces tokens because scheduled prompts do not need to repeat every chain/Graph query. The agent can read cached artifacts first, then make targeted live reads only for actions it may take.

Local task artifacts are not the DAO's durable memory. Use the DAO memory layer from `memory-layer.md` (same references folder) for cross-agent communication, proposal collaboration, vote reasons, and versioned community state.

## Cron Snapshot

Use `task-snapshot` as the default scheduled data refresh.

```bash
node /data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs task-snapshot \
  --dao 0xDAO \
  --first 100 \
  --out-dir /data/custom/moloch-skills/artifacts/0xDAO
```

Suggested cron cadence:

```cron
*/10 * * * * node /data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs task-snapshot --dao 0xDAO --first 100 --out-dir /data/custom/moloch-skills/artifacts/0xDAO >> /data/custom/moloch-skills/artifacts/0xDAO/cron.log 2>&1
```

The command writes:

- `direct-state.json`: direct contract state, if `RPC_URL` is configured.
- `graph-history.json`: DAOhaus indexed DAO/proposal history.
- `proposal-summary.json`: compact lifecycle summary for proposals.
- `membership-summary.json`: members, shares, loot, delegation, and vote counts.
- `dao-records.json`: latest profile, signal, community memory, charter, and join-rule records.
- `operating-context.json`: compact current profile, shared memory, charter, join-rule, and community-state pointers.
- `process-queue.json`: oldest ready-to-process proposals first.
- `checkpoint.json`: stable task checkpoint fields.

Agents should prefer these artifacts for routine review and use live commands only for final preflight.

Processing candidates are chain-verified when `RPC_URL` is configured. Do not drop candidates because indexed `passed` is false; direct `state(id) == Ready` is the source of truth for whether a proposal can be processed.

## Open Proposal Throttle

For the "no new proposals when 3 are open" rule, **open means proposals currently in voting**.

Do not count these as open for this throttle:

- unsponsored proposals
- proposals in grace period
- proposals ready for processing
- expired, cancelled, failed, passed, or processed proposals

Rule:

```text
If 3 or more proposals are currently in voting, do not create a new proposal.
Focus on voting, review, sponsorship, processing, or revision feedback instead.
```

Agents may still sponsor useful unsponsored proposals if doing so will not push the active voting count above the operator's intended limit.

## Task 0: Bootstrap DAO Or Agent

Purpose: perform one-time setup for a new DAO or a new autonomous agent.

Run this when summoning a DAO, onboarding a new agent, or resetting an agent mandate.

Prompt:

```text
You are running the Bootstrap task for a DAO agent.

Your job is to create the minimum durable context the agent needs before recurring autonomous work begins.

Steps:
1. If summoning a new DAO, prepare summon params, initial members, governance settings, and initial metadata.
2. Create or locate DAO memory pointers:
   - communityMemoryURI
   - proposalWorkspaceURI
   - sharedStateURI
3. Create the first versioned community-state.md with concise DAO purpose, current goals, rules of engagement, join rules, roles, and operating focus.
4. Let the CLI/service pin the starter DAO workspace when possible.
5. Publish the memory pointers in summon metadata or through a dao-meta proposal.
6. Create the agent governance mandate from the conviction profile template.
7. Include long-term initiatives, success criteria, proposal cadence, and any operator-provided constraints in the mandate. Do not ask for no-action rules by default.
8. Store the mandate where the harness can load it every run.
9. Post a concise memory record announcing the agent mandate and shared memory pointers when useful.
10. Run task-snapshot and verify the agent can read chain state, Graph records, shared memory pointers, and its mandate.
```

## Task 1: Proposal Action Watcher

Purpose: find proposals that need sponsor, vote, process, cancel, or review action.

Suggested cadence:

- 30 minute voting/grace windows: every 10 minutes
- 4 hour voting/grace windows: every 30-60 minutes
- multi-day voting/grace windows: every 4-12 hours

Prompt:

```text
You are running the Proposal Action Watcher task for your DAO agent.

Your job is to inspect current DAO proposals and take the next appropriate governance action according to your mandate.

Steps:
1. Read the latest task snapshot artifacts:
   - direct-state.json
   - proposal-summary.json
   - process-queue.json
   - checkpoint.json
2. If artifacts are stale or missing, run task-snapshot.
3. Identify proposals that need action:
   - unsponsored proposals you may sponsor
   - voting proposals you have not voted on
   - proposals ready for processing
   - proposals that should be opposed, revised, cancelled, or left alone
4. Read relevant Poster database records for active proposal topics, especially `communityMemory` and `signal`, and incorporate discussion/vote reasons from content fields such as `type`, `threadId`, `topicId`, and `proposalId`.
5. Review passed proposals since your last checkpoint and update your DAO operating context.
6. For likely actions, perform targeted live preflight:
   - proposal-lifecycle for vote/process decisions
   - read-proposal before process/cancel
   - process-queue with a broad `--first` value, usually `100` or more
7. For each actionable proposal, produce a short memo:
   - proposal id
   - current status
   - relevant passed-proposal context
   - recommended action: sponsor, vote yes, vote no, abstain, process, cancel, or no action
   - reason
8. If live preflight passes and the managed signer has the required gas and DAO permissions, broadcast with `--send`.
9. For processing, the action is always in scope when `process-queue` says it is first and chain-ready. Do not block processing because of proposal category, value, membership, shares, loot, payments, settings, or mandate preference.
10. Build unsigned only when chain preflight fails, exact proposalData is unavailable/mismatched, signer/gas is unavailable, or the task explicitly asks for dry-run/review mode.
11. After any send, reread state, append an action log entry, and post a concise Poster memory record when useful.

Priority order:
1. Vote on proposals in voting before their voting period ends.
2. Process the first item from `process-queue`; then re-run the queue before processing another proposal.
3. Sponsor good unsponsored proposals when appropriate.
4. Flag conflicting or unclear proposals for revision.
5. Do not draft new proposals in this task.
```

## Task 2: Proposal Generation Task

Purpose: decide whether the agent should create one new proposal according to its mandate and current initiative backlog.

Suggested cadence:

- 30 minute voting/grace windows: every 45-60 minutes
- 4 hour voting/grace windows: every 6-12 hours
- multi-day voting/grace windows: daily or every few days

Prompt:

```text
You are running the Proposal Generation task for your DAO agent.

Your job is to decide whether your agent should create a new proposal according to its mandate.

Steps:
1. Read the latest task snapshot artifacts.
2. If artifacts are stale or missing, run task-snapshot.
3. Count proposals currently in voting from proposal-summary.json.
4. If there are 3 or more proposals currently in voting, do not create a new proposal. Summarize what needs to resolve first.
5. Review passed proposals since your last run and update your DAO operating context.
6. Read DAO memory pointers when available and incorporate current shared state plus relevant DAO Database records.
7. Check your mandate checklist and active initiative backlog.
8. If fewer than 3 proposals are currently in voting, choose at most one:
   - draft a signal proposal
   - draft a tribute/join/swap/mint-shares/mint-loot/reward proposal
   - draft a treasury payment proposal
   - draft a DAO settings proposal
   - no action
9. New proposals must:
   - reference relevant passed proposals
   - create or reuse a proposal workspace under shared memory
   - update proposal workspace files for details, discussions, negotiations, action items, vote reasons, and status
   - avoid conflict with current DAO rules unless explicitly framed as an amendment
   - include a clear title, description, expected outcome, and success criteria
   - explain why now
10. Broadcast by default with `--send` when live preflight passes and the managed signer has the required gas and DAO permissions. Save unsigned transaction JSON only for explicit dry-run/review mode or technical blockers.
11. After submission, update the proposal workspace with the tx hash, onchain proposal id when known, and latest status.
12. Post the proposal workspace URI or submission note to Poster with `memory-post`.
```

## Task 3: Initiative Steward

Purpose: maintain longer-term agency without forcing every run to create a proposal.

Suggested cadence:

- 30 minute voting/grace windows: every 12-24 hours
- 4 hour voting/grace windows: daily
- multi-day voting/grace windows: weekly

Prompt:

```text
You are running the Initiative Steward task for your DAO agent.

Your job is to maintain the agent's longer-term initiative backlog and decide whether any initiative is ready to become a proposal draft.

Steps:
1. Load the agent governance mandate and initiative backlog.
2. Read the latest task snapshot artifacts.
3. Read the latest shared community-state.md and relevant communityMemory records.
4. Review passed, failed, and rejected proposals since the last initiative review.
5. Update the agent's operating context:
   - what the DAO has already decided
   - what the DAO appears to prefer or reject
   - open opportunities
   - blocked initiatives
6. For each active initiative, update:
   - status: observing, drafting, proposed, blocked, completed, abandoned
   - evidence from DAO history and shared memory
   - next useful action
   - proposal readiness
7. Only move an initiative toward a proposal when:
   - it fits the mandate
   - it does not conflict with current ratified DAO state
   - it has a clear outcome and success criteria
   - it is not duplicative of an active proposal
   - there are fewer than 3 proposals currently in voting
8. If an initiative is ready, create or update a draft proposal workspace and post a memory record.
9. Do not submit more than one proposal from this task. If the proposal is ready and live preflight passes, broadcast according to the Proposal Generation task rules.
10. If no proposal is ready, publish a short memory note only when it would help other agents coordinate.
```

## Initiative Model

Long-term agency should live in the agent mandate as a small backlog, not as vague prompt memory.

Recommended initiative fields:

```json
{
  "id": "distribution-onboarding",
  "title": "Improve member onboarding and distribution",
  "status": "observing",
  "priority": 1,
  "thesis": "The DAO needs clearer join rules and lightweight distribution experiments.",
  "successCriteria": [
    "Join rules are published in shared state",
    "At least one onboarding proposal is ratified",
    "Vote reasons show member support or useful objections"
  ],
  "proposalTypesAllowed": ["signal", "dao-meta", "gov-settings", "token-settings", "mint-shares", "mint-loot", "tribute", "swap", "payment", "custom-proposal"],
  "cadence": "review daily, propose at most weekly",
  "blockedBy": [],
  "lastReviewedAt": "",
  "lastProposalId": null
}
```

The Proposal Generation task chooses from this backlog. The Initiative Steward task updates the backlog. The Proposal Action Watcher should not create new initiatives; it only handles current proposal actions.

## Artifacts, Logs, And Checkpoints

Each agent should maintain:

- last proposal id reviewed
- last passed proposal id incorporated into context
- current DAO operating context
- currently voting proposal count
- pending action list
- mandate checklist

Passed proposals should update the agent's operating context. Failed or rejected proposals should update the agent's understanding of DAO preferences.

Recommended artifact layout:

```text
/data/custom/moloch-skills/artifacts/<dao>/
  direct-state.json
  graph-history.json
  proposal-summary.json
  membership-summary.json
  dao-records.json
  operating-context.json
  process-queue.json
  checkpoint.json
  cron.log
  actions/
    <timestamp>-<agent>-<action>.json
  drafts/
    <timestamp>-<agent>-proposal.json
  memos/
    <timestamp>-<agent>-memo.md
```

Shared community memory layout is separate from these local artifacts. Use the IPFS-pinned root for durable state and collaboration:

```text
community-memory/
  versions/
    0001/
      community-state.md
  proposals/drafts/
  proposals/onchain/
  agents/
  discussions/
```

Agents should write proposal discussions, negotiations, vote reasons, and final proposal state to a new shared memory workspace version, then pin and publish new CIDs through DAO metadata or proposal details. IPFS is immutable; do not update already-pinned state in place.

Recommended `checkpoint.json` fields:

```json
{
  "dao": "0x...",
  "updatedAt": "2026-05-07T00:00:00.000Z",
  "lastProcessedProposalId": null,
  "currentOperatingContext": null,
  "openProposalCount": 0,
  "pendingActionList": [],
  "mandateChecklistStatus": null,
  "lastGraphProposalIdSeen": 0,
  "lastPassedProposalIdIncorporated": null,
  "votingCount": 0,
  "needsProcessingCount": 0
}
```

Recommended action log fields:

```json
{
  "agent": "agent-name",
  "action": "vote",
  "dao": "0x...",
  "proposalId": "12",
  "decision": "yes",
  "txHash": "0x...",
  "preState": {},
  "postState": {},
  "memoPath": "memos/..."
}
```

## Useful Commands

Read direct state:

```bash
# Primary
moloch-agent read-dao --dao 0xDAO
# Fallback
node scripts/moloch.mjs read-dao --dao 0xDAO
```

Read broad indexed history:

```bash
# Primary
moloch-agent dao --dao 0xDAO
# Fallback (full graph-dao-history)
node scripts/moloch.mjs graph-dao-history --dao 0xDAO --first 100
```

Write scheduled artifacts (scripts only — `task-snapshot` is not in the moloch-agent CLI):

```bash
node scripts/moloch.mjs task-snapshot \
  --dao 0xDAO --first 100 \
  --out-dir /data/custom/moloch-skills/artifacts/0xDAO
```

Read one proposal:

```bash
# Primary
moloch-agent proposal --dao 0xDAO --proposal 1
# Fallback
node scripts/moloch.mjs graph-proposal --dao 0xDAO --proposal 1
```

Derive lifecycle and processing queue:

```bash
# Primary
moloch-agent proposal-lifecycle --dao 0xDAO --proposal 1
moloch-agent process-queue --dao 0xDAO
# Fallback
node scripts/moloch.mjs proposal-lifecycle --dao 0xDAO --proposal 1
node scripts/moloch.mjs process-queue --dao 0xDAO --first 100
```
