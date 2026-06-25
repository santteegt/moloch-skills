# Moloch Agent Conviction

Use this reference to create or apply an agent's governance mandate. "Conviction" is the values layer: the agent's bias, orientation, and long-term commitments. The concrete operating artifact should be called a **mandate** or **voting policy**.

This reference does not replace transaction safety checks. Use `dao-read.md` before evaluating proposals and `proposal-actions.md` before any vote/sponsor/process action.
For the general voting workflow, also use `vote-decision-flow.md` (same references folder).

## Bootstrap Workflow

Use `bootstrap.md` (same references folder) for first-time agent setup. Bootstrap asks the operator or harness for the mandate; it does not define the mandate itself.

1. Create a mandate from `assets/conviction-profile.template.json` after the DAO address and initial shared memory pointers are known.
2. Fill in identity, values, voting rules, abstain rules, initiative backlog, and autonomous execution rules.
3. Store the mandate wherever the agent harness expects persistent memory.
4. If the DAO wants an auditable mandate, ratify it with a signal proposal or post a mandate pointer through DAO database memory.
5. Before each vote or proposal generation task, load the latest mandate and current proposal state.

## Required Profile Sections

- `identity`: agent name, DAO, address, mandate version.
- `values`: ranked principles the agent should optimize for.
- `defaultVotePolicy`: when to vote yes, no, or abstain.
- `proposalRubric`: scoring categories and minimum thresholds.
- `initiativePolicy`: proposal cadence, throttle, and rules for longer-term agency.
- `initiatives`: a small backlog of longer-term goals the agent may advance over time.
- `hardNoRules`: conditions that force a no vote.
- `abstainRules`: conditions that force an abstain vote or no-action decision.
- `sponsorshipPolicy`: when the agent may sponsor a proposal.
- `executionPolicy`: how the agent performs required proposal processing.
- `autonomyPolicy`: how the agent acts without operator approval.
- `auditLog`: how to record reasoning and transaction hashes.

## Vote Evaluation

For every proposal, produce a short vote memo before building a vote transaction:

```text
Proposal:
Relevant mandate version:
Current proposal state:
Scores:
Hard-no checks:
Abstain/no-action checks:
Recommended action:
Reason:
Confidence:
```

Broadcast a vote transaction when the memo reaches a clear recommendation under the mandate and live chain preflight passes. Use `--send` without waiting for operator confirmation. If the memo is unclear, choose `abstain` or `no action` according to the mandate and record the reason.

## Long-Term Initiatives

Use initiatives to give the agent durable agency beyond single proposal reactions. Keep the list small, usually one to three active initiatives.

Each initiative should define:

- `id`
- `title`
- `status`: `observing`, `drafting`, `proposed`, `blocked`, `completed`, or `abandoned`
- `priority`
- `thesis`
- `successCriteria`
- allowed proposal types
- cadence
- blockers
- last review/proposal references

The agent should update initiatives after passed, failed, rejected, or processed proposals. It should only turn an initiative into a proposal when the latest DAO state supports it, the outcome is clear, the proposal is not duplicative, and the open proposal throttle allows it.

## Default Decision Rules

Use these defaults unless the conviction profile overrides them:

- Vote `yes` when the proposal advances the DAO's stated values, has bounded risk, and clears rubric thresholds.
- Vote `no` when it violates a hard-no rule, weakens DAO integrity, creates unbounded obligations, or conflicts with the charter.
- Abstain when facts are missing, conflicts of interest are present, proposal text is ambiguous, or the mandate does not cover the decision.
- Sponsor only when the proposal is legible, within scope, and worthy of DAO attention even if the final vote may still be no.
- Process the first chain-ready proposal as mechanical settlement of completed governance. Do not treat processing as a second vote or subjective mandate decision.

## Autonomous Execution Rules

- Never invent values. If the mandate is missing, draft a mandate proposal or create a local draft mandate before voting.
- A managed agent is expected to broadcast its own sponsor, vote, process, cancel, and proposal transactions when the mandate points to that action and live preflight passes.
- Re-read direct chain state before any sponsor/vote/process/cancel action.
- Use Graph for proposal metadata and vote history, but direct contract reads for current permission/timing checks.
- Processing should not be blocked by proposal category, value, membership, shares, loot, payments, settings, or mandate preferences. The only blockers are failed chain preflight, missing/mismatched exact proposalData, or lack of gas/signer capability.
- Record the final memo, chosen action, tx hash if any, and post-action state.

## Charter Integration

If the DAO has a charter, values statement, or ratified mandate:

- Prefer the latest ratified version over local defaults.
- Store the canonical URI/hash in the conviction profile.
- Link proposal reasoning back to the relevant charter section.
- For amendments, evaluate both the amendment content and the legitimacy of the process.

## Suggested Storage

For Prism, store the durable profile in harness-managed memory or runtime assets, for example:

```text
/data/custom/moloch-skills/profiles/<dao-or-agent>-conviction.json
```

Do not store private keys in the conviction profile.
