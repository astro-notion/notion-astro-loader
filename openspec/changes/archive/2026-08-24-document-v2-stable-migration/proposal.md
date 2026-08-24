## Why

The stable `2.0.0` release introduces consumer-visible breaking changes, but the repository has no migration guide or curated changelog. The current generated-release flow would describe only the delta from `2.0.0-beta.2`, leaving users upgrading from the `1.1.2` stable channel without the requirements and steps needed to migrate safely.

## What Changes

- Add a consumer-focused `1.1.2` to `2.0.0` migration guide covering supported Node.js and Astro versions, the Notion data-source API migration, loader configuration changes, and asset behavior.
- Add curated `2.0.0` release notes organized by user impact, including breaking changes, additions, fixes, and upgrade instructions.
- Link the migration guide from the README and stable release documentation.
- Update the maintainer release procedure so a stable major release publishes curated notes based on the previous stable version instead of relying only on notes generated from the latest prerelease.
- **BREAKING**: Document that `2.0.0` requires Node.js `>=22.13.0`, Astro `>=6 <8`, and a Notion `data_source_id` in place of the previous database query configuration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-release`: Require consumer migration documentation and curated stable release notes that describe the complete change from the previous stable release.

## Impact

- Documentation: README, a versioned migration guide or changelog, and `docs/CONTRIBUTING.md`.
- Release automation: `.github/workflows/release.yml` or the documented maintainer workflow for supplying curated GitHub Release notes.
- Public APIs and dependencies are not changed by this proposal; it documents the breaking changes already present in the `2.0.0` release line.
