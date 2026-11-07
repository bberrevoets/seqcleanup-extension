# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex and others) working in this repository. `CLAUDE.md` only imports
this file, so edit this one. [README.md](README.md) covers what the extension does and how to develop it; this file lists
what the code alone doesn't tell you.

<!-- repo-init:start -->
## Repository Info

- **Company:** Berrevoets Systems
- **Author:** Bert Berrevoets
- **Contact:** <bert@berrevoets.net>
- **Remote:** <https://github.com/bberrevoets/seqcleanup-extension> (public)

## Workflow Rules

- **GitHub Flow:** `main` is the default and only long-lived branch. It is protected by the ruleset "Protect main":
  no direct pushes, no deletion, changes only through a pull request, and all PR conversations must be resolved
  before merging. Merged head branches are deleted automatically.
- After cloning, run `git config pull.rebase true` once, so `git pull` rebases instead of creating merge commits.
- Work on a branch per topic, push it, and open a PR to `main` only when Bert asks for it, assigned to him
  (`gh pr create --assignee bberrevoets`). PRs are squash-merged. After a merge: switch to `main` and pull, then delete the
  local branch with `git branch -D <branch>` (`-d` refuses after a squash merge) once
  `gh pr view <branch> --json state,headRefOid` shows `MERGED` and the same commit as `git rev-parse <branch>`.
- **"Update the documentation"** means `AGENTS.md`, the project's own `README.md` files (not vendored third-party ones)
  and `CHANGELOG.md`; then commit and push.
- [CHANGELOG.md](CHANGELOG.md) follows Keep a Changelog: the Attributors list at the top, and one `Author: *Name*`
  line under each section heading (`### Added`, `### Changed`, ...).
- Markdown must pass `markdownlint-cli2 "**/*.md"` with [.markdownlint.json](.markdownlint.json) (180-character
  lines) before every commit.
- Binaries go through Git LFS: every `filter=lfs` pattern in `.gitattributes` — the standard set (PDF, ZIP, PNG,
  JPEG, STEP/STP, STL, 3MF, F3D/F3Z) plus any pattern this repository adds. Add a pattern there before committing
  another binary type (GIF, BMP, ...). The patterns are lowercase and match `X.PNG` only where `core.ignorecase` is
  true (Windows, macOS); on a case-sensitive system check a new binary with `git check-attr filter -- <file>` before
  committing it.
- Commit messages use the conventional style (`feat:`, `fix:`, `docs:`, `chore:`).
<!-- repo-init:end -->

## Project Overview

A Docker Desktop extension that wipes Seq event data with one button. Public; `1.0.1` is on Docker Hub. The Marketplace
submission, [docker/extensions-submissions#259](https://github.com/docker/extensions-submissions/issues/259), has passed
validation but waits on Docker's pause on new submissions
([#249](https://github.com/docker/extensions-submissions/issues/249), both still open on 2026-11-07).

## Architecture

- UI-only Docker Desktop extension: a React + MUI frontend in `ui/`, no backend container.
  Every Docker action goes through the extension API (`ddClient.docker.cli.exec`).
- The Seq image match (`datalust/seq`), data mount point (`/data`) and directory to delete (`Stream`) are constants at the top of
  [ui/src/App.tsx](ui/src/App.tsx). Deletion runs in a throwaway `alpine` helper container.

## Commands

```shell
cd ui && npm ci && npm run build && npm test   # build type-checks src/; npm test runs Vitest on src/ with --passWithNoTests (no tests yet)
npx tsc -p tsconfig.node.json --noEmit --composite false   # type-check vite.config.ts (from ui/; not `tsc -b`, which emits vite.config.js)
make install-extension                          # build the image and install it in Docker Desktop
make push-extension TAG=x.y.z                   # release: multi-arch build and push to Docker Hub
```

CI never publishes; releases are pushed by hand with `make push-extension`. The variable is `TAG` (uppercase).

## Constraints

- **React 18 and MUI 6 stay put.** `@docker/docker-mui-theme` supports only React 17–18 and `@mui/material` 5–6.
  Don't bump their majors (Dependabot ignores them for the same reason).
- **Node versions move together.** `@types/node`, the `node:*-alpine` image in the [Dockerfile](Dockerfile) and `node-version` in
  [ci.yml](.github/workflows/ci.yml) share one major.
- **CI job names are load-bearing.** `ui`, `docker` and `markdown` are required status checks in the `main` ruleset.
  Renaming a job blocks every PR until the ruleset is updated.
- **The screenshot is in Git LFS.** URLs to `docs/screenshot.png` (Dockerfile labels, docs) must use `media.githubusercontent.com`;
  `raw.githubusercontent.com` serves the LFS pointer file instead of the image.
- **Releases touch several files:** the version in `ui/package.json`, the `com.docker.extension.changelog` label in the Dockerfile,
  the install command in README.md, and CHANGELOG.md.

## Conventions

- **Dependabot PRs:** Codex does not review them by itself, so the required CI checks are the gate. Its auto-rebase can race a
  merge: check that the PR head's parent is the tip of `main`, and merge with `--match-head-commit <full sha>`. These PRs don't
  touch the changelog, so record them by hand in the next docs PR, under `[Unreleased]` in `### Changed` with
  "(Dependabot, PR #n)", and add the number to the Dependabot line in Attributors.
- **Lint:** [.markdownlint-cli2.jsonc](.markdownlint-cli2.jsonc) sets `gitignore: true`, so the lint command skips
  `ui/node_modules` locally too. The `markdown` CI job enforces it.
