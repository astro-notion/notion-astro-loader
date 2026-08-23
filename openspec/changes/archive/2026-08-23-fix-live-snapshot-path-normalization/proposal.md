## Why

Live Notion snapshots currently retain a machine-dependent sequence of parent-directory segments when an absolute temporary path is normalized before its overlapping relative form. This makes the reviewed baseline unreliable across local machines and GitHub-hosted runners, so the release verification can fail even when rendering behavior is unchanged.

## What Changes

- Normalize overlapping temporary path representations without leaving workspace-depth-dependent prefixes.
- Add regression coverage for absolute and relative temporary paths that refer to the same directory.
- Regenerate the live renderer snapshot so temporary asset references use a single stable placeholder.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-verification`: Require live snapshot normalization to produce identical temporary-root placeholders across differing project and temporary-directory depths.

## Impact

- Affects `tests/live/normalize.ts`, its unit coverage in `tests/live-verification.test.ts`, and the reviewed live snapshot fixture.
- Does not change the package's public API, runtime loader behavior, dependencies, or release version.
