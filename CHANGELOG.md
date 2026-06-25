# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-25

### Added
- `moloch-agent` as a single self-contained installable skill bundling all sub-skill content as progressive-disclosure references
- Six new reference docs inside `moloch-agent/references/`: `proposals.md`, `proposal-actions.md`, `dao-read.md`, `summon.md`, `conviction.md`, `scripts.md`
- `moloch-agent/scripts/` with `moloch.mjs` and `network-config.mjs`
- `moloch-agent/config/networks.json` as single source of truth for Base contract addresses and subgraph ID
- `moloch-agent/assets/community-memory/` — shared memory root template (was `templates/`)
- `moloch-agent/assets/conviction-profile.template.json` — agent governance mandate template
- `agentfightclub` skill with `references/clawbank.md` for full ClawBank/Fight Club command reference
- `skills.sh.json` — registry grouping for skills.sh display
- `npx skills` install instructions in README

### Changed
- Repo restructured from 9 separate skills to 3 installable skills: `moloch-agent`, `agentfightclub`, `meta-clawtel-launch`
- All sub-skills (`moloch-shared`, `moloch-proposals`, `moloch-proposal-actions`, `moloch-dao-read`, `moloch-summon`, `moloch-agent-conviction`) converted to progressive-disclosure reference docs inside `moloch-agent/references/`
- Script paths updated to skill-root-relative (`scripts/moloch.mjs`) throughout all reference docs
- Network config path unified to `moloch-agent/config/networks.json`
- `agentfightclub` and `meta-clawtel-launch` now reference the `moloch-agent` skill by name instead of cross-skill file paths
- Prism install instructions updated to reflect single `moloch-agent` skill registration

### Removed
- Separate `moloch-shared/`, `moloch-proposals/`, `moloch-proposal-actions/`, `moloch-dao-read/`, `moloch-summon/`, `moloch-agent-conviction/` skill directories
- `templates/` root directory (content moved to `moloch-agent/assets/community-memory/`)
