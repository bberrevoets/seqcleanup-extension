# Agent instructions

Guidance for AI coding agents (Codex, Claude Code, and others) working in this repository.
[README.md](README.md) covers what the extension does and how to develop it; this file lists what the code alone doesn't tell you.

## Architecture

- UI-only Docker Desktop extension: a React + MUI frontend in `ui/`, no backend container.
  Every Docker action goes through the extension API (`ddClient.docker.cli.exec`).
- The Seq image match (`datalust/seq`), data mount point (`/data`) and directory to delete (`Stream`) are constants at the top of
  [ui/src/App.tsx](ui/src/App.tsx). Deletion runs in a throwaway `alpine` helper container.

## Commands

```shell
cd ui && npm ci && npm run build && npm test   # build type-checks src/; tests use --passWithNoTests (there are none yet)
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

- GitHub Flow: `main` is protected. Work on a branch and open a pull request; never push to `main`.
- [CHANGELOG.md](CHANGELOG.md) follows Keep a Changelog. Under each section heading (`### Added`, `### Changed`, ...) put one
  `Author: *Name*` line, and keep the Attributors list at the top current.
- Markdown must pass markdownlint with [.markdownlint.json](.markdownlint.json) (180-character lines); CI enforces it.
