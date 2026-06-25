# Prism Integration

This repo contains Codex skills plus runtime assets for DAOhaus/Moloch V3/Baal DAO operations.

For scheduled agent task patterns, use `agent-tasks.md` (same references folder).
Prefer `task-snapshot` cron jobs for routine state gathering so agents can consume compact artifacts instead of repeating verbose Graph/RPC reads.
For vote reasoning, use `vote-decision-flow.md` (same references folder).
For shared DAO memory and proposal workspaces, use `memory-layer.md` (same references folder).

## Prism Install Pattern

For Prism instances, do not install these skills only into `CODEX_HOME` or `/data/codex/skills`.

Use the Prism-managed skill flow:

1. Store runtime assets under:

   `/data/custom/moloch-skills`

2. Store each managed skill definition through the site service:

   `POST /api/internal/skills`

3. The managed skill definitions should be written under:

   `/data/skills/<skill-name>/SKILL.md`

4. Each `SKILL.md` should reference runtime scripts by absolute path, for example:

   `/data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs`

## Runtime Assets

The shared CLI lives in:

```bash
/data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs
```

Install dependencies from:

```bash
cd /data/custom/moloch-skills/moloch-agent
npm install
node scripts/moloch.mjs --help
```

## Environment

For the full variable list, install steps, and execution mode flags, read `setup.md`
(same references folder).

Prism-specific notes:

- Scripts use the absolute runtime path; set env vars in the Prism skill environment,
  not the shell.
- `PRIVATE_KEY` is only required for `--send` operations on the shared scripts.
  Never request or use it for read-only commands.
- If 1Password CLI is available, omit `PRIVATE_KEY` from the environment and pass
  `--vault-provider 1password --vault-item "<item>" --vault-field private_key` with `--send`.
- Use a dedicated RPC provider (Alchemy, Infura) for scheduled agents; the public
  Base RPC (`https://mainnet.base.org`) can rate-limit chatty agents.

## Autonomous Execution Rules

- Read-only skills may run freely.
- Prism action skills should broadcast by default when live preflight passes and the managed signer has the required gas and DAO permissions.
- Transaction-building skills should use unsigned transaction JSON only for explicit dry-run, review, or draft tasks.
- Do not ask for operator approval before sending routine DAO actions.
- Do not broadcast with `--send` when chain preflight fails, required proposal data is missing or mismatched, signer/gas is unavailable, or the task explicitly asks for build-only mode.
- Before broadcasting, re-read current DAO/proposal state from chain.
- Graph data can lag; use direct contract reads for permissions, timing, and threshold checks.
- Record transaction hashes and re-read state after confirmation.
- Keep operator output abstract by default. Do not paste ABI fragments, large calldata, or full Graph JSON unless requested.
- Use `proposal-lifecycle` and `process-queue` instead of raw Graph fields when deciding whether to vote or process.
- Prism should treat managed DAO agents as autonomous actors and require post-action rereads.

## Recommended Prism Skill Split

Install `moloch-agent` as the primary skill. The following capability domains are available
as references within `moloch-agent/references/`:

Read-first references (safe for read-only agents):

- `dao-read.md` — DAO and proposal state reads
- `proposals.md` — proposal encoding and submission
- `conviction.md` — agent governance mandate setup

Action references (autonomous execution enabled):

- `proposal-actions.md` — sponsor, vote, process, cancel
- `summon.md` — DAO summoning

Supporting references (always available):

- `scripts.md` — full shared script command cheatsheet and decode tools
- `setup.md` — environment, install, execution modes
- `bootstrap.md` — first-run flow
- `agent-tasks.md` — scheduled task prompts
- `memory-layer.md` — DAO memory model
- `prism.md` — Prism-specific rules

## Prism Skill Author Prompt

Use this prompt inside a Prism instance:

```text
Install HausDAO moloch skills as Prism-managed custom skills.

Source repo:
https://github.com/HausDAO/moloch-skills

DAOhaus Admin frontend implementation:
https://github.com/HausDAO/daohaus-admin

Hosted admin instance:
https://admin.daohaus.club/

Use:
- runtime assets: /data/custom/moloch-skills
- managed skill definitions: POST /api/internal/skills
- do not install final skills only into /data/codex/skills

Install the moloch-agent skill:
- SKILL.md: moloch-agent/SKILL.md
- references: moloch-agent/references/
- scripts: /data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs
- config: /data/custom/moloch-skills/moloch-agent/config/networks.json

Each Prism-managed SKILL.md must reference the shared CLI by absolute path:
/data/custom/moloch-skills/moloch-agent/scripts/moloch.mjs

Install Node dependencies in:
/data/custom/moloch-skills/moloch-agent

Verify:
- Skills appear in Prism Skills UI.
- A read-only command works.
- task-snapshot writes artifacts.
- Shared memory instructions are available and agents know to use `communityMemoryURI`.
- Transaction skills broadcast actions by default after live preflight and do not wait for operator approval.
```

## Future Machine-Readable Pack

If Prism needs stricter automation later, add a small `prism.skill-pack.json`. Start with this file because agents will read it naturally when they encounter the repo.
