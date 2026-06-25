# Contributing

## Pull requests

Open PRs against `main`. The [validate workflow](.github/workflows/validate.yml) runs
automatically and checks three things:

1. **SKILL.md frontmatter** — every `SKILL.md` must have a `name` and `description` field
   in its YAML frontmatter block.
2. **JSON validity** — all `.json` files (excluding `node_modules/`) must parse cleanly.
3. **Dead directory references** — `.md` and `.json` files must not reference directories
   removed in v1.0.0: `moloch-shared/`, `moloch-proposals/`, `moloch-proposal-actions/`,
   `moloch-dao-read/`, `moloch-agent-conviction/`, `templates/community-memory`.

Fix any failures before requesting review. The checks are strict by design — they catch the
cross-skill path breakage that `npx skills` installation exposes at install time rather than
at agent runtime.

## Releasing

Releases are driven by [CHANGELOG.md](CHANGELOG.md). The
[release workflow](.github/workflows/release.yml) runs on every push to `main` that touches
`CHANGELOG.md`. It reads the first versioned heading, and if no matching git tag exists,
creates the tag and a GitHub release with that section's content as the release body.

**To cut a release:**

1. Move items from `## [Unreleased]` into a new versioned section:
   ```markdown
   ## [1.1.0] - 2026-07-01
   ### Added
   - ...
   ```
2. Commit and merge to `main`.
3. The workflow tags `v1.1.0` and publishes the release automatically.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
- **patch** — doc fixes, typo corrections, path updates
- **minor** — new reference docs, new skill capabilities, new script commands
- **major** — structural changes that break existing install paths or agent workflows

## Skill structure rules

- Each installable skill lives at the repo root with a `SKILL.md` containing `name` and
  `description` frontmatter.
- All paths inside a skill must be **skill-root-relative** (e.g. `scripts/moloch.mjs`,
  `config/networks.json`). Cross-skill paths break after `npx skills` installation because
  each skill is installed in isolation.
- Sub-skill content goes inside the skill as progressive-disclosure references
  (`references/*.md`), not as separate top-level skill directories.
