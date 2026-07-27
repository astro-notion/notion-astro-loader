## Context

The package currently develops against Astro 6.1.9 and declares `astro: ">=6 <7"` as a peer dependency. Its integration surface uses public Astro APIs from `astro`, `astro/loaders`, `astro/zod`, `astro:assets`, and `astro:content`; it does not use Vite internals. The existing compatibility suite covers the loader contract, Notion data semantics, schemas, and image conversion, but its name and assertions are specific to Astro 6.

Astro 7 upgrades its compiler and Vite dependency, while its migration guide indicates that projects and integrations not relying on Vite internals may require no source changes. Compatibility still needs to be demonstrated because this package exports Astro-derived types and schemas and runs inside Astro's Content Layer.

## Goals / Non-Goals

**Goals:**

- Support Astro 6 and Astro 7 through one unchanged public loader API.
- Compile package source against Astro 7 and verify representative consumer usage against both supported majors.
- Preserve existing loader, schema, rendering, image, caching, and deprecated-option behavior.
- Make dual-major verification repeatable for maintainers.

**Non-Goals:**

- Dropping Astro 6 support.
- Supporting Astro versions earlier than 6 or pre-releases beyond the declared range.
- Adopting Astro 7-only APIs or adding version branches without a demonstrated incompatibility.
- Changing Notion loading or rendering behavior.
- Migrating unrelated dependencies solely because newer versions are available.

## Decisions

### Declare one continuous peer range

Set the Astro peer dependency range to `>=6 <8`. This is the smallest additive public contract that accepts both supported majors and avoids separate package variants.

Alternative considered: publish separate Astro 6 and Astro 7 package versions. Rejected because the loader API is expected to remain common and parallel variants would increase maintenance and consumer confusion.

### Develop against Astro 7 and verify the lower bound separately

Use Astro 7 as the root development dependency so normal type checking, tests, and builds exercise the newest supported API surface. Add isolated compatibility verification using Astro 6 so the lower supported major remains proven rather than inferred from the peer range.

The isolated verification may use dedicated fixtures or an ephemeral dependency matrix, but each run must resolve the package against the targeted Astro major rather than merely changing a label in a shared test. Prefer the least complex mechanism that is repeatable locally and in automation.

Alternative considered: keep Astro 6 as the only development dependency and rely on source inspection for Astro 7. Rejected because peer compatibility is a runtime and type-level claim that requires execution against Astro 7.

### Make compatibility tests version-neutral

Retain the behavioral coverage in `tests/astro-v6-support.test.ts`, but rename and adjust it so the same assertions describe the supported Astro contract rather than one implementation version. Add focused version-specific coverage only if Astro 7 exposes an actual behavioral difference.

Alternative considered: duplicate the full suite for Astro 7. Rejected because identical test bodies would drift and would not prove that each suite resolved a different Astro installation.

### Preserve public behavior unless validation requires a narrow adaptation

Do not introduce runtime major-version detection preemptively. If validation finds an incompatible public API, isolate the smallest adaptation at the Astro boundary and test both branches. Consumers must not need version-specific loader configuration.

Alternative considered: branch broadly on Astro's installed version. Rejected because it adds unneeded paths and relies on package-version detection rather than capability-compatible public APIs.

### Treat official migration guidance as the compatibility baseline

Validate all imported Astro entry points and account for Astro 7's documented breaking changes. Vite 8 and compiler changes are low direct risk because this package neither accesses Vite internals nor ships Astro templates, but the consumer fixture and build remain part of verification.

Source: https://docs.astro.build/en/guides/upgrade-to/v7/

## Risks / Trade-offs

- [Astro 6 regresses after moving the root development dependency to Astro 7] -> Run isolated Astro 6 type and behavior checks before release.
- [A test matrix appears to cover both majors but resolves only the root Astro installation] -> Verify the resolved Astro major in each isolated run and fail on mismatch.
- [A transitive dependency differs between Astro majors] -> Use clean, targeted installs and commit the canonical root lockfile for Astro 7.
- [Broad compatibility assertions hide a version-specific difference] -> Keep common assertions shared and add narrowly scoped version-specific tests only when required.
- [The compatibility mechanism adds disproportionate repository complexity] -> Prefer an ephemeral matrix over duplicate source trees unless fixtures are necessary for correct peer resolution.

## Migration Plan

1. Update the root Astro development dependency and lockfile to Astro 7.
2. Generalize the existing compatibility suite and validate package source plus the compile-only consumer fixture under Astro 7.
3. Add isolated Astro 6 verification and prove that it resolves Astro 6.
4. Widen the peer dependency range only after both majors pass the compatibility contract.
5. Update supported-version documentation and run the full quality sequence: formatting, type checking, tests, and build.

Rollback consists of restoring the Astro 6 development dependency, lockfile, and peer range if Astro 7 compatibility cannot be achieved without changing the public contract. No consumer data migration is involved.

## Open Questions

- Whether an ephemeral dependency matrix or dedicated package fixtures provide the simplest reliable Astro 6 verification can be settled during implementation by confirming peer resolution with each approach.
