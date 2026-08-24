## MODIFIED Requirements

### Requirement: Successful publications create GitHub Releases

The release system SHALL create a GitHub Release for the pushed tag only after npm publication succeeds. Prerelease versions SHALL use generated release notes and SHALL be marked as GitHub prereleases. Stable versions SHALL publish a checked-in, curated release-note document for the exact package version, and the workflow MUST validate that document before npm publication.

#### Scenario: Prerelease publication succeeds

- **WHEN** npm successfully publishes version `2.0.0-beta.1`
- **THEN** the workflow creates a generated GitHub prerelease for tag `v2.0.0-beta.1`

#### Scenario: Stable publication succeeds

- **WHEN** npm successfully publishes version `2.0.0`
- **THEN** the workflow creates a stable GitHub Release for tag `v2.0.0` using the checked-in curated notes for `2.0.0`

#### Scenario: Stable release notes are missing

- **WHEN** a stable release tag is validated but the tagged source does not contain the curated release-note document for that package version
- **THEN** the workflow fails before publishing the package to npm

#### Scenario: npm publication fails

- **WHEN** npm rejects or fails the publication
- **THEN** the workflow does not create a GitHub Release for that execution

### Requirement: The release procedure is documented and repeatable

The repository SHALL provide a canonical contribution guide that distinguishes contributor work from maintainer releases and documents exact commands for version selection, release commit and annotated tag creation, stable release-note validation, atomic push, first beta migration, verification, and failure recovery. Stable major releases MUST include consumer-focused release notes and a migration guide from the previous npm `latest` version. The README SHALL link to the contribution guide, current stable release notes, and migration guide.

#### Scenario: Contributor prepares a change

- **WHEN** a contributor reads the contribution guide
- **THEN** the guide directs them to use pull requests and not edit package versions or create release tags

#### Scenario: Maintainer prepares a routine release

- **WHEN** a maintainer follows the stable or prerelease procedure
- **THEN** the documented commands create matching package metadata, release commit, and tag and push `main` and the tag atomically

#### Scenario: Maintainer prepares a stable major release

- **WHEN** a maintainer prepares `2.0.0` while npm `latest` points to `1.1.2`
- **THEN** the tagged source contains curated `2.0.0` release notes and an ordered `1.1.2` to `2.0.0` migration guide verified against the public package contract

#### Scenario: Existing user looks for upgrade instructions

- **WHEN** a `1.1.2` user reads the README or `2.0.0` release notes
- **THEN** the documentation links them to migration steps covering runtime requirements, Notion data-source configuration, loader schema behavior, and hosted asset handling

#### Scenario: Maintainer publishes the first v2 beta

- **WHEN** `main` already contains package version `2.0.0-beta.1` without a corresponding release tag
- **THEN** the guide provides the one-time annotated-tag and atomic-push procedure without incrementing the version

#### Scenario: Release partially fails

- **WHEN** validation, npm publication, or GitHub Release creation fails
- **THEN** the guide identifies whether a tag may be corrected, a failed job may be rerun, or a new immutable package version is required
