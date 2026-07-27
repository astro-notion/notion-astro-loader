## Why

Astro 7 is the maintained major release, but the package currently restricts consumers to Astro 6. Supporting both majors lets Astro 7 projects adopt the loader without forcing existing Astro 6 consumers to upgrade.

## What Changes

- Add Astro 7 to the package's supported peer dependency range while retaining Astro 6 compatibility.
- Validate the loader's public Astro integration points against both supported majors.
- Add focused Astro 7 compatibility coverage alongside the existing Astro 6 suite.
- Document the supported Astro versions and any migration-relevant constraints discovered during validation.

## Capabilities

### New Capabilities

- `astro-version-compatibility`: Defines the supported Astro major versions and the compatibility guarantees that must be verified for each version.

### Modified Capabilities

None.

## Impact

- Affects `package.json`, the lockfile, compatibility tests, compile-only Astro fixtures, and package documentation.
- Expands the public Astro peer dependency contract from Astro 6 only to Astro 6 and Astro 7.
- Requires validation of imports from `astro`, `astro/loaders`, `astro/zod`, `astro:assets`, and `astro:content` under both majors.
- Does not intentionally change loader configuration, stored content, rendering output, or the package's Node.js requirement.
