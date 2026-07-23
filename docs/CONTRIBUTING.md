# Contributing and Releasing

This is the canonical contribution guide and maintainer release procedure for `@astro-notion/loader`.

## Prerequisites

- Node.js `>=22.12.0`
- The pnpm version pinned in `package.json` through Corepack or `pnpm/action-setup`
- Git and a GitHub account
- For maintainers: permission to push release commits and tags to `main`, publish `@astro-notion/loader` on npm, and create GitHub Releases

Install dependencies and run the same checks as CI:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm exec prettier --check "src/**/*.{ts,js,json}"
pnpm typecheck
pnpm test
pnpm build
```

## Contributor Workflow

1. Create a branch from the latest `main`.
2. Keep changes focused and add or update tests for behavior changes.
3. Run the checks above.
4. Open a pull request targeting `main`.

Contributors must not edit the package version or create release tags. Merging a pull request or pushing a branch never publishes to npm; only maintainers perform releases.

## Trusted Publisher Setup

Before the first tag-triggered release, configure the npm trusted publisher for `@astro-notion/loader` with these exact values:

| npm field            | Value                 |
| -------------------- | --------------------- |
| Organization or user | `astro-notion`        |
| Repository           | `notion-astro-loader` |
| Workflow filename    | `release.yml`         |
| Environment name     | `npm`                 |
| Allowed action       | `npm publish`         |

The workflow filename is case-sensitive and must be entered without `.github/workflows/`. Do not add an `NPM_TOKEN`; the release workflow uses a GitHub-hosted runner and the `id-token: write` permission for npm OIDC trusted publishing.

References:

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance](https://docs.npmjs.com/generating-provenance-statements)

## Routine Maintainer Release

Start from an up-to-date, clean `main` and run the quality gates before changing the version:

```sh
git switch main
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
git status --short
```

Choose exactly one version command. `pnpm version` creates the release commit and matching annotated `v<version>` tag.

For a stable patch release:

```sh
pnpm version patch
```

Use `minor` or `major` instead of `patch` when appropriate. To promote a prerelease to a known stable version, pass it explicitly, for example `pnpm version 2.0.0`.

For the next beta prerelease:

```sh
pnpm version prerelease --preid beta
```

Use an explicit version such as `pnpm version 2.1.0-beta.0` when starting a new prerelease line. Inspect the generated commit and tag, then push `main` and that tag atomically:

```sh
VERSION=$(node -p "require('./package.json').version")
git show --stat "v${VERSION}"
git push --atomic origin main "v${VERSION}"
```

The tag starts `.github/workflows/release.yml`. The workflow rejects a tag that does not exactly equal `v<package.json version>` or whose commit is not contained in `origin/main`.

## First `2.0.0-beta.1` Release

Use this one-time procedure only while `main` already contains version `2.0.0-beta.1` and npm does not contain that version. Do not run `pnpm version` because the package is already versioned.

```sh
git switch main
git pull --ff-only origin main
test "$(node -p "require('./package.json').version")" = "2.0.0-beta.1"
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
git tag -a v2.0.0-beta.1 -m "Release v2.0.0-beta.1"
git push --atomic origin main v2.0.0-beta.1
```

## Verify a Release

Wait for the `Release` workflow to finish, then verify the registry and GitHub state:

```sh
npm view @astro-notion/loader dist-tags --json
npm view @astro-notion/loader@2.0.0-beta.1 version
gh release view v2.0.0-beta.1
```

For the first beta, `latest` must remain `1.1.2`, `next` must become `2.0.0-beta.1`, and the npm package page must display provenance. The GitHub Release must contain generated notes and be marked as a prerelease. Stable releases must update `latest`; prereleases must update `next` without changing `latest`.

## Recover a Failed Release

Determine whether npm published the version before changing tags or rerunning jobs:

```sh
VERSION=$(node -p "require('./package.json').version")
npm view "@astro-notion/loader@${VERSION}" version
```

### Validation or quality gate failed before publication

If npm does not contain the version, fix the release commit. An unpublished incorrect tag may be deleted and recreated on the corrected `main` commit:

```sh
FAILED_TAG=v2.0.0-beta.2 # Replace with the tag named by the failed workflow.
git push origin ":refs/tags/${FAILED_TAG}"
git tag -d "${FAILED_TAG}"
# Fix and commit the issue, then recreate the tag.
EXPECTED_TAG="v$(node -p "require('./package.json').version")"
git tag -a "${EXPECTED_TAG}" -m "Release ${EXPECTED_TAG}"
git push --atomic origin main "${EXPECTED_TAG}"
```

Never move or reuse a tag after its package version has been published.

### npm publication failed

If npm does not contain the version, correct the trusted-publisher or registry issue and rerun the failed `Validate and publish` job. Confirm the npm publisher uses organization `astro-notion`, repository `notion-astro-loader`, and workflow filename `release.yml` exactly.

### npm succeeded but GitHub Release creation failed

Do not rerun npm publication. Rerun only the failed `Create GitHub Release` job, or recover manually:

```sh
VERSION=$(node -p "require('./package.json').version")
gh release create "v${VERSION}" --generate-notes --prerelease --verify-tag
```

Omit `--prerelease` for a stable version.

### A published version is bad

npm versions are immutable. Do not delete and reuse the version or move its tag. Deprecate the bad version, restore the appropriate dist-tag if necessary, fix the problem, and publish a new version:

```sh
npm deprecate "@astro-notion/loader@<bad-version>" "Use <replacement-version> instead"
npm dist-tag add "@astro-notion/loader@<previous-stable-version>" latest
# For a bad prerelease, restore next instead:
npm dist-tag add "@astro-notion/loader@<previous-prerelease-version>" next
```
