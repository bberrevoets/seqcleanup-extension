# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Attributors

- **Bernardus Berrevoets** — Author (2026-08-27)
- **Dependabot** — Dependency updates (PR #1, 2026-08-27)

## [Unreleased]

## 2026-09-26 — Maintenance release (1.0.1)

### Changed

Author: *Bernardus Berrevoets*

- Bumped `vite` 3 → 8 and `@vitejs/plugin-react` 2 → 6 in `ui/` (Dependabot, PR #1). The build output is unchanged.
- Binary assets (`*.png`, `*.jpg`, `*.jpeg`, `*.zip`, `*.pdf`, `*.step`, `*.3mf`, `*.stl`) are now stored in Git LFS;
  the history was rewritten to migrate `docs/screenshot.png`.
- The marketplace screenshot label now points at `media.githubusercontent.com`, which serves LFS-backed files
  (`raw.githubusercontent.com` returns the LFS pointer instead of the image).
- Added `.markdownlint.json` (180-character line limit) and ignored `*.code-workspace` files.

### Fixed

Author: *Bernardus Berrevoets*

- The extension detail description (Dockerfile label) and this changelog no longer describe a hardcoded `seq-data` volume;
  they now match the image-based discovery that shipped in 1.0.0.

## 2026-08-27 — First public release (1.0.0)

> Author: Bernardus Berrevoets

### Added

- Published the extension image to Docker Hub as `bberrevoets/seqcleanup-extension:1.0.0` (multi-arch: amd64 + arm64).
- Published the source at <https://github.com/bberrevoets/seqcleanup-extension>; the marketplace labels (icon,
  screenshot, publisher URL, additional URLs) now point at hosted GitHub URLs.

- Custom extension icon (`docker.svg`): navy badge with a broom sweeping log lines, replacing the default Docker whale icon.
  Used both as the sidebar tab icon (`metadata.json`) and, embedded as a base64 data URI in the `com.docker.desktop.extension.icon` label, as the Manage-extensions card icon.
- Cleanup button that stops the containers using the selected Seq data volume, removes the `Stream` directory from the volume root,
  and restarts the containers that were running.
- Confirmation dialog before deletion and a step-by-step progress log in the extension UI.
- Changelog content in the `com.docker.extension.changelog` Dockerfile label, shown in Docker Desktop's extension detail dialog.
- Marketplace metadata labels: detailed description (Details tab) and categories (`volumes,utility-tools`).
  Screenshots, publisher URL, and additional URLs remain TODO until the project has a public home (see the TODO in the `Dockerfile`).

### Changed

- `make push-extension` now passes `--provenance=false --sbom=false`, so the pushed manifest list contains only the
  real platforms (no `unknown/unknown` attestation entries).
- The volume is no longer hardcoded: the extension discovers Seq containers by image (`datalust/seq`), reads the
  volume mounted at `/data`, and asks which instance to clean when several are found. Bind-mounted data
  directories are supported as well.
- Converted the extension to UI-only: removed the template Go backend, its Unix-socket wiring (`vm` section in `metadata.json`, Go build stage in the `Dockerfile`), and `docker-compose.yaml`.
  The final image is now built `FROM scratch`.
- Rewrote `README.md` to describe the actual extension instead of the `docker extension init` template.

### Fixed

- Corrected the extension title from "Seq Cleaneup" to "Seq Cleanup" in `metadata.json` and the `Dockerfile` labels.
