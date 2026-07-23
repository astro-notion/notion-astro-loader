## Why

The current workflows publish from development branches and pull requests while targeting the legacy `master` branch, making releases difficult to predict and unsafe to run after moving development to `main`. A small maintainer team needs a release process that is explicit, repeatable, and documented without introducing a release-management service.

## What Changes

- Replace branch- and pull-request-triggered npm publishing with a single workflow triggered by `v*` Git tags.
- Validate that the tag is valid SemVer, matches `package.json`, and points to a commit contained in `main` before publishing.
- Run installation, type checking, tests, and build checks before every publication.
- Publish stable versions to npm's `latest` dist-tag and prerelease versions to `next`.
- Authenticate to npm through trusted publishing with GitHub Actions OIDC and publish package provenance.
- Create a GitHub Release with generated notes after npm publication succeeds.
- Update CI to use `main`, least-privilege permissions, and the repository's pinned pnpm version.
- Add `docs/CONTRIBUTING.md` with contributor and maintainer instructions, including the exact version, tag, push, verification, and recovery commands.
- Remove the existing `master`, `dev` canary, and pull-request publication workflows.
- Account for all four existing GitHub Actions workflows being temporarily disabled during this change, then enable the updated CI and new tag-triggered release workflows after they land.

## Capabilities

### New Capabilities

- `workflow-release`: Defines validation, npm publication, GitHub Release creation, distribution-tag selection, and documented maintainer procedures for tag-triggered releases.

### Modified Capabilities

None.

## Impact

- GitHub Actions workflows under `.github/workflows/` will be replaced or updated.
- All four existing workflows are currently disabled in GitHub; rollout must restore the replacement CI and release workflows without restoring the obsolete publication workflows.
- npm package settings must authorize the release workflow as a trusted publisher.
- Repository settings must permit maintainers to push release commits and matching tags to `main`.
- Contributors and maintainers will use `docs/CONTRIBUTING.md` as the canonical contribution and release guide.
- No runtime package API or dependency behavior changes.
