## Context

The repository has moved active development from `dev` to `main`, but its workflows still target `master`, publish canary builds from `dev`, and attempt npm publication from pull requests. The npm `latest` release is `1.1.2`, while the code now on local `main` is versioned `2.0.0-beta.1` and has not been published. The project has one active maintainer and does not need a release orchestration service, but it does need an explicit boundary between merging code and publishing an immutable npm version.

The release process affects GitHub Actions, npm trusted-publisher settings, repository branch rules, package versioning, Git tags, GitHub Releases, and maintainer documentation. Contributors should only need to understand the normal pull-request process; maintainers own version commits and release tags.

## Goals / Non-Goals

**Goals:**

- Make a matching `v<package-version>` tag on a commit contained in `main` the only publication trigger.
- Keep normal pushes and pull requests free of npm publication side effects.
- Validate and build the exact tagged source before publishing it.
- Keep stable and prerelease npm distribution tags correct automatically.
- Remove long-lived npm credentials by using trusted publishing and provenance.
- Keep npm, Git tags, and GitHub Releases aligned.
- Provide copy-pasteable maintainer commands, first-release migration steps, verification, and recovery guidance.

**Non-Goals:**

- Automatically select a semantic version from commit history.
- Generate or maintain a changelog.
- Publish preview packages for pull requests or canary packages for development branches.
- Maintain multiple release branches or automate backports to the 1.x line.
- Require manual approval after a valid release tag is pushed.
- Change the package's runtime API or supported consumer Node.js versions.

## Decisions

### Use a Git tag as the publication boundary

The release workflow will trigger only for pushed tags matching `v*`. It will derive the expected tag from `package.json` and require exact equality, then verify that the tagged commit is contained in `origin/main`. A branch push alone cannot publish.

This keeps publication intentional without introducing Release Please or Changesets. Triggering on a version-file change or commit message was rejected because both are mutable conventions and ordinary pushes could accidentally satisfy them.

### Let maintainers create the version commit and tag locally

Maintainers will use `pnpm version` to update `package.json` and create the matching release commit and tag. Documentation will use an atomic Git push so `main` and the release tag either both update or neither updates.

A mandatory version-bump pull request was rejected for this two-person project because it adds ceremony without improving the immutable tag validation. Normal feature changes still use pull requests, while repository rules may grant maintainers the narrow ability to push release commits directly.

### Validate before any external release side effect

The workflow will fetch full history, resolve the tag to its commit, fetch `main`, compare the tag with `package.json`, verify main containment, install with the frozen lockfile, type-check, test, and build. Publication occurs only after every check succeeds. A concurrency group will serialize releases without cancelling an in-progress publication.

Relying only on CI from the earlier merge was rejected because a release must prove the exact tagged source and package metadata.

### Use npm trusted publishing

The publish job will run on a GitHub-hosted runner with Node.js and npm versions that support npm OIDC, grant `id-token: write`, and execute `npm publish`. npm will be configured separately to trust the exact workflow file. No `NPM_TOKEN` will be stored.

An npm token was rejected because it is long-lived, requires rotation, and does not provide the same workflow-bound identity. Trusted publishing also supplies provenance for this public package.

### Route prereleases to `next`

Versions containing a SemVer prerelease component will publish with `--tag next`; stable versions will publish to npm's default `latest` tag. Thus publishing `2.0.0-beta.1` cannot replace stable `1.1.2` for ordinary installs.

Mapping each identifier to separate `alpha`, `beta`, and `rc` tags was rejected because one `next` channel is easier to document and maintain for this project.

### Create the GitHub Release after npm publication

A separate job, dependent on successful npm publication, will create the GitHub Release with generated notes. Prerelease versions will be marked as GitHub prereleases. The job will use the GitHub CLI and `contents: write`, avoiding an additional third-party action.

Keeping this as a separate job allows maintainers to rerun only GitHub Release creation if that step fails after npm succeeds. Creating the release first was rejected because it could advertise a version that npm failed to publish.

### Make contribution documentation canonical

`docs/CONTRIBUTING.md` will separate contributor instructions from maintainer-only release instructions. It will document stable and prerelease commands, the special first `2.0.0-beta.1` tag, atomic push, expected npm dist-tags, post-release verification, and recovery from validation, npm, or GitHub Release failures. The README will link to this guide.

## Risks / Trade-offs

- [A maintainer pushes an incorrect tag] -> Exact tag/version and main-containment checks fail before publication; documentation explains deleting and recreating an unpublished tag.
- [npm publication succeeds but GitHub Release creation fails] -> The release is split into separate jobs so only the failed job can be rerun; documentation also provides a manual GitHub CLI recovery command.
- [A release workflow is rerun after npm succeeds] -> npm versions are immutable, so maintainers must rerun only failed jobs or use the documented recovery path rather than rerunning publication.
- [Direct maintainer release commits bypass normal PR review] -> Only release commits are documented for direct push, and the tag workflow reruns all quality gates against the exact commit.
- [The trusted publisher is not configured correctly] -> The first publish fails without exposing a credential; setup and verification steps are documented before the first tag is pushed.
- [The 1.x line needs another release] -> This design intentionally advances `main` to v2; a `release/1.x` branch and separate policy would need a future change.

## Migration Plan

1. Replace the existing release workflows and update CI while `main` is still unpublished at `2.0.0-beta.1`.
2. Add the contribution guide and link it from the README.
3. Merge or push the workflow changes to `main` and confirm CI passes without publishing.
4. Configure npm trusted publishing for the exact repository and release workflow filename.
5. Create annotated tag `v2.0.0-beta.1` on the matching `main` commit and push `main` and the tag atomically.
6. Verify npm keeps `latest` on `1.1.2`, sets `next` to `2.0.0-beta.1`, publishes provenance, and creates a GitHub prerelease.
7. Remove obsolete npm automation secrets after successful migration.

Rollback before the first tag consists of reverting the workflow and documentation change. After npm publication, the version cannot be reused; recovery consists of deprecating a bad version, restoring the prior dist-tag if necessary, fixing the issue, and releasing a new version.

## Open Questions

None. npm authentication, prerelease routing, main containment, publication approval, GitHub Release creation, and version-commit policy were resolved during proposal creation.
