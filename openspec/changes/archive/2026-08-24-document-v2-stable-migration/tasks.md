## 1. Consumer Documentation

- [x] 1.1 Add `docs/migrations/2.0.md` with an ordered and verifiable `1.1.2` to `2.0.0` upgrade path covering Node.js and Astro requirements, `database_id` to `data_source_id`, dynamic loader schemas, hosted asset destinations, and before-and-after configuration examples.
- [x] 1.2 Add `docs/releases/2.0.0.md` with curated breaking, added, changed, and fixed sections based on consumer-visible behavior since `1.1.2`, plus a link to the migration guide.
- [x] 1.3 Link the `2.0.0` release notes and migration guide from the README without duplicating their detailed content.

## 2. Stable Release Procedure

- [x] 2.1 Update release validation to derive `docs/releases/<version>.md` for stable versions and fail before npm publication when the exact file is absent or empty, while leaving prerelease validation unchanged.
- [x] 2.2 Update GitHub Release creation to check out the tagged source and publish the checked-in notes for stable versions while retaining generated notes and prerelease marking for prerelease versions.
- [x] 2.3 Update `docs/CONTRIBUTING.md` with the stable release-note naming convention, migration-document expectation for major releases, and pre-tag verification commands.

## 3. Verification

- [x] 3.1 Verify documentation links, commands, option names, version ranges, and examples against `package.json`, the public loader types, and the Astro 6/7 compatibility fixtures.
- [x] 3.2 Exercise both release-note selection branches without publishing: a prerelease selects generated notes, a stable version selects its checked-in notes, and a stable version with no notes fails.
- [x] 3.3 Run formatting, type checking, Astro 6/7 compatibility tests, runtime tests, and the package build in CI order.
