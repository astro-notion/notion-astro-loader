## ADDED Requirements

### Requirement: Releases are triggered only by version tags

The release system SHALL start package publication only when a Git tag whose name begins with `v` is pushed. Pushes to branches and pull-request events MUST NOT publish a package.

#### Scenario: Version tag is pushed

- **WHEN** a maintainer pushes tag `v2.0.0-beta.1`
- **THEN** the release workflow starts validation for that tagged source

#### Scenario: Ordinary code is pushed

- **WHEN** commits are pushed to `main` without a version tag
- **THEN** CI runs without starting npm publication

#### Scenario: Pull request is opened or updated

- **WHEN** a contributor opens or updates a pull request
- **THEN** no package version is published to npm

### Requirement: Release tags identify validated main commits

The release system MUST require the pushed tag to equal `v` followed by the exact `package.json` version, MUST reject invalid package versions, and MUST require the tagged commit to be contained in `main` before publication.

#### Scenario: Tag matches the package version on main

- **WHEN** tag `v2.0.0-beta.1` points to a commit contained in `main` whose package version is `2.0.0-beta.1`
- **THEN** release validation proceeds to the quality gates

#### Scenario: Tag and package version differ

- **WHEN** the pushed tag does not equal `v` followed by the package version
- **THEN** the workflow fails before authenticating to or publishing on npm

#### Scenario: Tag points outside main

- **WHEN** a matching version tag points to a commit that is not contained in `main`
- **THEN** the workflow fails before authenticating to or publishing on npm

### Requirement: Tagged source passes release quality gates

The release system SHALL install the tagged source with the frozen pnpm lockfile and SHALL complete type checking, tests, and a production build before publication. Release executions MUST be serialized and MUST NOT cancel a publication already in progress.

#### Scenario: All release checks pass

- **WHEN** dependency installation, type checking, tests, and build succeed for the tagged source
- **THEN** the workflow proceeds to npm publication

#### Scenario: A release check fails

- **WHEN** any dependency installation, type-check, test, or build step fails
- **THEN** the workflow stops without publishing to npm or creating a GitHub Release

#### Scenario: Two release tags are pushed close together

- **WHEN** a release is running and another release tag starts a workflow
- **THEN** the workflows execute serially without cancelling the active release

### Requirement: npm publication uses trusted publishing

The release system SHALL authenticate to npm using GitHub Actions OIDC trusted publishing, SHALL request only the permissions needed by each job, and MUST NOT require a stored npm publication token. Publication of the public package SHALL include npm provenance.

#### Scenario: Trusted publisher accepts the workflow identity

- **WHEN** all validation and quality gates pass in the configured GitHub-hosted workflow
- **THEN** npm accepts the publication using its short-lived OIDC identity and records provenance

#### Scenario: Trusted publisher is misconfigured

- **WHEN** npm does not trust the repository and workflow identity
- **THEN** publication fails without falling back to a long-lived npm token

### Requirement: npm distribution tags preserve the stable channel

The release system SHALL publish stable SemVer versions to npm's `latest` dist-tag and SHALL publish any SemVer prerelease version to the `next` dist-tag.

#### Scenario: Prerelease version is published

- **WHEN** package version `2.0.0-beta.1` passes release validation
- **THEN** npm publishes it with dist-tag `next` and leaves `latest` unchanged

#### Scenario: Stable version is published

- **WHEN** package version `2.0.0` passes release validation
- **THEN** npm publishes it with dist-tag `latest`

### Requirement: Successful publications create GitHub Releases

The release system SHALL create a GitHub Release for the pushed tag only after npm publication succeeds, SHALL generate release notes, and SHALL mark SemVer prerelease versions as GitHub prereleases.

#### Scenario: Prerelease publication succeeds

- **WHEN** npm successfully publishes version `2.0.0-beta.1`
- **THEN** the workflow creates a generated GitHub prerelease for tag `v2.0.0-beta.1`

#### Scenario: Stable publication succeeds

- **WHEN** npm successfully publishes version `2.0.0`
- **THEN** the workflow creates a generated stable GitHub Release for tag `v2.0.0`

#### Scenario: npm publication fails

- **WHEN** npm rejects or fails the publication
- **THEN** the workflow does not create a GitHub Release for that execution

### Requirement: The release procedure is documented and repeatable

The repository SHALL provide a canonical contribution guide that distinguishes contributor work from maintainer releases and documents exact commands for version selection, release commit and annotated tag creation, atomic push, first beta migration, verification, and failure recovery. The README SHALL link to this guide.

#### Scenario: Contributor prepares a change

- **WHEN** a contributor reads the contribution guide
- **THEN** the guide directs them to use pull requests and not edit package versions or create release tags

#### Scenario: Maintainer prepares a routine release

- **WHEN** a maintainer follows the stable or prerelease procedure
- **THEN** the documented commands create matching package metadata, release commit, and tag and push `main` and the tag atomically

#### Scenario: Maintainer publishes the first v2 beta

- **WHEN** `main` already contains package version `2.0.0-beta.1` without a corresponding release tag
- **THEN** the guide provides the one-time annotated-tag and atomic-push procedure without incrementing the version

#### Scenario: Release partially fails

- **WHEN** validation, npm publication, or GitHub Release creation fails
- **THEN** the guide identifies whether a tag may be corrected, a failed job may be rerun, or a new immutable package version is required
