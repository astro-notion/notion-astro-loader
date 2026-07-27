## 1. Compatibility Harness

- [x] 1.1 Rename and generalize the Astro 6 compatibility suite so its assertions define version-neutral loader, schema, and asset behavior.
- [x] 1.2 Add an isolated compatibility runner or fixtures for Astro 6 and Astro 7 that fail unless each run resolves the requested Astro major.
- [x] 1.3 Ensure both compatibility environments compile the representative `astro:content` collection fixture against the local package.

## 2. Astro 7 Baseline

- [x] 2.1 Upgrade the root Astro development dependency and lockfile to the latest supported Astro 7 release.
- [x] 2.2 Run type checking, focused compatibility tests, and the package build against Astro 7; make only the narrow Astro-boundary changes required by documented incompatibilities.
- [x] 2.3 Confirm loader configuration, store writes, digest caching, `archived` translation, exported schemas, and image conversion retain their existing behavior under Astro 7.

## 3. Dual-Major Contract

- [x] 3.1 Run the isolated Astro 6 compatibility checks and resolve any regressions without adding consumer-facing version branches.
- [x] 3.2 Widen the Astro peer dependency range to `>=6 <8` after both supported majors pass.
- [x] 3.3 Add package scripts or maintainer instructions that make both major-version checks repeatable before release.

## 4. Documentation and Verification

- [x] 4.1 Document Astro 6 and Astro 7 support and any version-specific limitations found during validation.
- [x] 4.2 Run Prettier checks, type checking, both focused compatibility checks, the complete Vitest suite, and the package build in the repository's CI order.
- [x] 4.3 Inspect the final package metadata and packed output to confirm the supported peer range and compatibility artifacts are correct without publishing a release.
