## 1. Remove Unsafe Publication Paths

- [x] 1.1 Delete the `master` branch release, `dev` canary release, and pull-request publication workflows so no branch or pull-request event can publish to npm.
- [x] 1.2 Update the CI workflow to run for pushes and pull requests involving `main`, use read-only repository permissions, and install the pnpm version pinned by `packageManager`.
- [x] 1.3 Verify a normal `main` push and pull-request workflow contain only formatting, type-check, test, and build operations with no npm publication credentials or commands.

## 2. Implement Tag-Triggered Publication

- [x] 2.1 Add a release workflow triggered only by pushed `v*` tags, with non-cancelling release concurrency and least-privilege job permissions.
- [x] 2.2 Validate that the tag exactly matches `v<package.json version>`, that the package version is publishable SemVer, and that the resolved tag commit is contained in fetched `origin/main`.
- [x] 2.3 Install the frozen pnpm lockfile and run type checking, tests, and build against the exact tagged source before any external release side effect.
- [x] 2.4 Configure the publish job for a GitHub-hosted Node.js and npm version that supports trusted publishing, grant `id-token: write`, and publish without an `NPM_TOKEN`.
- [x] 2.5 Route prerelease versions to npm dist-tag `next` and stable versions to npm dist-tag `latest`, preserving public-package access and provenance.
- [x] 2.6 Add a dependent GitHub Release job that uses the GitHub CLI to generate release notes and marks prerelease versions appropriately only after npm publication succeeds.

## 3. Document Contribution And Release Procedures

- [x] 3.1 Create `docs/CONTRIBUTING.md` with prerequisites, contributor pull-request expectations, and a clear statement that contributors do not edit versions or create release tags.
- [x] 3.2 Document copy-pasteable stable and prerelease `pnpm version` commands and an atomic push command that updates `main` and its matching annotated tag together.
- [x] 3.3 Document the one-time `v2.0.0-beta.1` tagging procedure for the already-versioned package without incrementing it again.
- [x] 3.4 Document expected npm `latest` and `next` results, provenance and GitHub Release verification, incorrect-tag recovery, partial-failure reruns, and immutable-version recovery.
- [x] 3.5 Link the contribution guide from `README.md` and identify it as the canonical maintainer release procedure.

## 4. Verify Release Readiness

- [x] 4.1 Validate workflow YAML and confirm all actions, permissions, branch names, package-manager versions, and release commands match the design.
- [x] 4.2 Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and a package dry run to verify the tagged artifact can be built and packed.
- [x] 4.3 Confirm tag/version mismatch, tag-outside-main, failed quality gate, stable version, and prerelease version paths against the specification without publishing a package.
- [x] 4.4 Review the final diff to confirm no npm token is referenced and no unrelated runtime package behavior changed.

## 5. Configure And Roll Out Trusted Publishing

- [x] 5.1 Configure npm trusted publishing for `@astro-notion/loader` using the exact repository owner, repository name, and release workflow filename.
- [x] 5.2 Land the workflow and documentation on `main`, enable the updated CI and new tag-triggered release workflows in GitHub, confirm CI succeeds, and confirm the branch push does not start package publication; do not re-enable the removed publication workflows.
- [ ] 5.3 Create annotated tag `v2.0.0-beta.1` on the matching `main` commit and atomically push `main` and the tag after maintainer approval.
- [ ] 5.4 Verify npm keeps `latest` at `1.1.2`, sets `next` to `2.0.0-beta.1`, displays provenance, and GitHub creates a generated prerelease.
- [ ] 5.5 Remove any obsolete npm publication secret after the trusted-publishing release succeeds.
