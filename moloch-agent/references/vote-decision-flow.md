# Vote Decision Flow

This repo should be opinionated about **how** agents decide, not **what** values they must hold.

Agents should not vote only from proposal text. They should evaluate the proposal against:

- the agent's own mandate / conviction profile
- the agent's identity and role in the DAO
- the DAO's current charter, join rules, and operating context
- passed proposals that set precedent or constraints
- direct lifecycle state and action data
- conflicts of interest or missing information

## Required Inputs

Before recommending a vote, load:

1. Agent mandate:
   - `conviction.md` (same references folder)
   - local conviction profile or Prism-managed memory
2. DAO operating context:
   - `operating-context.json` from `task-snapshot`
   - latest `charter`, `joinRules`, and `daoProfile` records
3. Proposal state:
   - `proposal-lifecycle`
   - `graph-proposal`
   - `read-proposal` for direct chain status when needed
4. Relevant history:
   - passed proposals since the last checkpoint
   - prior proposals on the same topic

## Decision Steps

1. **Classify the proposal**
   - signal / advisory
   - membership / shares / loot
   - treasury or payment
   - DAO metadata / charter / join rules
   - governance settings
   - arbitrary execution

2. **Check action truth**
   - Does proposal type match operator intent?
   - Does action data match proposal text?
   - Is it executable or text-only?
   - Is the proposal in the correct lifecycle state?

3. **Check agent mandate**
   - Does this advance the agent's stated values?
   - Does this conflict with hard-no rules?
   - Does the agent have authority to vote on this autonomously?

4. **Check DAO alignment**
   - Does this conflict with a passed charter, join rule, or operating policy?
   - Does it amend prior decisions explicitly?
   - Does it create unclear obligations?

5. **Check risk and reversibility**
   - Can the DAO undo this later?
   - Does it move funds, issue voting power, change permissions, or alter governance?
   - Does the mandate point to yes, no, abstain, sponsor, process, or no action?

6. **Choose action**
   - vote yes
   - vote no with amendment path
   - abstain
   - sponsor
   - process
   - no action

## Vote Memo

Every vote should produce a compact memo:

```text
Agent:
Mandate version:
DAO:
Proposal:
Proposal lifecycle:
Proposal kind:

Recommendation:
Vote:
Confidence:

Mandate alignment:
DAO alignment:
Relevant passed proposals:
Action-data check:
Risk:
Conflict of interest:

Reason:
What would change my mind:
```

## Default Voting Policy

Use these defaults only when the agent's own mandate does not override them.

Vote yes when:

- the proposal is aligned with the agent mandate and DAO charter
- action data matches the written intent
- risk is bounded and understandable
- the proposal has clear owner, scope, and expected outcome

Vote no when:

- action data conflicts with proposal text
- it violates a hard-no rule or passed DAO policy
- it issues shares, loot, funds, permissions, or governance changes without enough context
- it creates open-ended obligations

Abstain when:

- the agent lacks enough context
- the proposal is outside the agent's mandate
- there is a conflict of interest
- Graph and direct chain state materially disagree

Sponsor when:

- the proposal is legible and worth DAO attention
- sponsorship does not imply endorsement in the agent's mandate
- the agent has enough delegated voting power and no conflict

Process when:

- `proposal-lifecycle` shows `processableNow: true`
- exact indexed `proposalData` is available
- direct chain state confirms the previous-proposal gate

Processing a passed proposal is mechanical settlement of completed governance, not a fresh vote or mandate decision. Do not block processing because of proposal category, value, membership, shares, loot, payments, settings, or agent preference. The DAO can deadlock if ready proposals are not processed.

## Examples

### Example: Signal Proposal

```text
Proposal kind: SIGNAL
Question: Should the DAO adopt this distribution theme?
Decision: Vote yes if it aligns with charter/goals and creates no binding treasury or membership action.
No vote path: Vote no and propose clearer success criteria or a narrower theme if useful.
```

### Example: Membership / Shares Proposal

```text
Proposal kind: TOKENS_FOR_SHARES
Question: Should this account receive voting shares?
Decision: Check join rules, requested shares, tribute amount, member role, and prior contribution.
No vote path: Vote no and propose lower shares, a clearer role, or a trial/loot-only path if useful.
```

### Example: Charter Metadata Proposal

```text
Proposal kind: UPDATE_METADATA_SETTINGS
Question: Should this charter or join-rule URI become the current DAO reference?
Decision: Check whether the linked content was ratified or has enough support.
No vote path: Vote no and propose a signal proposal to ratify the document first if useful.
```

### Example: Governance Settings Proposal

```text
Proposal kind: UPDATE_GOV_SETTINGS
Question: Should voting/grace/quorum/sponsor settings change?
Decision: Check current proposal flow, participation, risk of spam, and deadlock risk.
No vote path: Vote no and propose a temporary experiment with a checkpoint date if useful.
```

## Operator Output

Do not dump full calldata in vote memos. Report:

- proposal id and title
- lifecycle status
- recommendation
- reason
- tx hash if sent
- post-action state after reread
