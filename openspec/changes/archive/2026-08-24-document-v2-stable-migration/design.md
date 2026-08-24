## Context

The npm `latest` channel currently points to `1.1.2`, while `2.0.0-beta.2` is published on `next`. The new major changes the supported Node.js and Astro versions, replaces database queries with Notion data-source queries, adopts Astro's current dynamic schema contract, and changes how hosted assets are persisted and emitted.

The repository documents the current configuration in the README, but it does not explain how an existing `1.1.2` consumer reaches that configuration. GitHub Releases are created with `--generate-notes`, so the eventual stable release would otherwise summarize only commits after the latest beta instead of the complete consumer-visible delta from `1.1.2`.

## Goals / Non-Goals

**Goals:**

- Give existing users one ordered, verifiable migration path from `1.1.2` to `2.0.0`.
- Publish stable release notes organized around consumer impact rather than commit history.
- Make the curated stable notes part of the tagged source and have the release workflow publish them without manual post-publication editing.
- Keep prerelease note generation and the existing trusted-publishing sequence intact.

**Non-Goals:**

- Change the loader, schema, formatter, rendering, or asset APIs.
- Restore support for Node.js 18, Astro 5, or the deprecated Notion database query API.
- Document every internal refactor or OpenSpec artifact created during the 2.0 development cycle.
- Introduce a release-note generation dependency or external changelog service.

## Decisions

### Use separate migration and release-note documents

Create `docs/migrations/2.0.md` for ordered upgrade instructions and `docs/releases/2.0.0.md` for the curated release summary. The migration guide optimizes for completing an upgrade, while the release notes optimize for understanding impact; combining them would make both harder to scan.

The README will link to both documents rather than duplicating their content. A monolithic `CHANGELOG.md` was considered, but it would still require extracting a version section for GitHub and would create another representation of the migration procedure.

### Treat the published stable version as the migration baseline

The documentation will compare `2.0.0` with npm's prior `latest` version, `1.1.2`, rather than with `2.0.0-beta.2`. It will explicitly cover runtime requirements, `database_id` to `data_source_id`, Astro loader schema changes, hosted asset destinations, and renamed package/import configuration where applicable.

Using the latest beta as the baseline was rejected because stable-channel users do not install prereleases by default and would miss most breaking changes.

### Publish checked-in notes for stable releases

For a stable version, the release workflow will derive `docs/releases/<version>.md` from `package.json`, fail before npm publication if that file is absent, and pass it to `gh release create`. Prereleases will continue using generated notes and the `next` dist-tag.

Keeping curated notes only as a maintainer checklist item was rejected because npm publication precedes GitHub Release creation; a missing document discovered afterward cannot make the already-published package release complete or repeatable.

### Keep release notes consumer-focused

The `2.0.0` notes will group changes under breaking changes, added, changed, and fixed sections. Entries will state observable behavior and link to the migration guide. Internal commits, agent configuration, and specification bookkeeping will be omitted unless they change the consumer contract.

## Risks / Trade-offs

- [The migration guide can drift from the implementation] -> Verify every command, option name, version range, and import against `package.json`, public types, README examples, and compatibility fixtures during implementation.
- [Requiring a checked-in file can block an otherwise valid stable tag] -> Document the naming convention and validate the file before the version commit and tag are pushed.
- [Release notes and migration instructions can overlap] -> Keep release notes concise and link to the migration guide for procedural detail.
- [The workflow change affects future stable releases] -> Derive the path from the exact package version and retain generated notes for prereleases, preserving the current beta flow.

## Migration Plan

1. Add and review the `2.0.0` migration guide against the `1.1.2` and current public contracts.
2. Add curated `2.0.0` release notes and link them from the README.
3. Update the maintainer guide with the required release-note path and pre-tag verification.
4. Update the release workflow to validate and publish checked-in notes for stable versions while preserving generated prerelease notes.
5. Exercise the stable and prerelease branches without publishing, then run the normal release quality gates.

Rollback consists of reverting the workflow change before a stable tag is pushed. Documentation files can remain available even if automation is rolled back because they do not affect package runtime behavior.

## Open Questions

None.
