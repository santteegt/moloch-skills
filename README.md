# Moloch Agent Skills

Skills and runtime tools for operating DAOhaus / Moloch V3 / Baal DAOs on Base.

Maintained repo: `https://github.com/HausDAO/moloch-skills`
DAOhaus Admin: `https://github.com/HausDAO/daohaus-admin` — hosted at `https://admin.daohaus.club/`

---

## Install

```bash
# All three skills
npx skills add HausDAO/moloch-skills

# Individual skills
npx skills add HausDAO/moloch-skills --skill moloch-agent
npx skills add HausDAO/moloch-skills --skill agentfightclub
npx skills add HausDAO/moloch-skills --skill meta-clawtel-launch

# Pin to a release
npx skills add HausDAO/moloch-skills@v1.0.0
```

After installing `moloch-agent`, run `npm install` once in `.claude/skills/moloch-agent/`
before using the fallback scripts. The `moloch-agent` CLI needs no install step.

---

## Entry points

**Direct Moloch rails** — start here for autonomous DAO agents managing their own runtime:

```
moloch-agent/SKILL.md
```

**Agent Fight Club** — start here to choose between direct rails and ClawBank integration:

```
agentfightclub/SKILL.md
```

---

## Skills

Three installable skills (`npx skills` discovers each folder with a `SKILL.md`):

| Skill | Purpose |
|---|---|
| `moloch-agent` | Default entry point. Autonomous agent operations via the hosted moloch service. Bundles all sub-skill content as progressive-disclosure references. |
| `agentfightclub` | Path-chooser: direct Moloch rails or ClawBank integration. |
| `meta-clawtel-launch` | Launch parameters and template for the Meta Clawtel DAO specifically. |

---

## Reference docs

All reference docs live inside `moloch-agent/references/`:

| File | Contents |
|---|---|
| `setup.md` | Install, environment variables, execution modes (`--build-only` / `--send`). |
| `bootstrap.md` | First-time agent setup for a new or existing DAO. |
| `agent-tasks.md` | Scheduled task patterns: cron snapshot, proposal watcher, initiative steward. |
| `vote-decision-flow.md` | Vote evaluation framework and decision steps. |
| `memory-layer.md` | Shared DAO memory: Poster, Graph, IPFS, and proposal workspaces. |
| `prism.md` | Prism-specific install pattern and skill registration. |
| `proposals.md` | Signal, governance, token/admin, tribute, and custom proposals. |
| `proposal-actions.md` | Sponsor, vote, process, and cancel proposals. |
| `dao-read.md` | Read DAO and proposal state from contracts and the DAOhaus subgraph. |
| `summon.md` | Summon a new Moloch V3/Baal DAO. |
| `conviction.md` | Agent governance mandate: values, voting policy, and initiative backlog. |
| `scripts.md` | Full `moloch.mjs` command cheatsheet, decode tools, proposal data encoding. |

Network config (contract addresses, subgraph ID) lives in `moloch-agent/config/networks.json`.

---

## Experiments

See [`experiments/`](experiments/) for multi-agent and experimental flow examples.
