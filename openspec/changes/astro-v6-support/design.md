## Context

The package currently implements an Astro 5-era Content Loader and documents support for Astro 5 with Node 18+. The current loader returns an object with `name`, `schema`, and `load`, dynamically generates collection schemas from Notion database metadata, and renders page blocks to HTML while caching Notion-hosted images under `src/` for Astro's asset pipeline.

Astro 6 changes several assumptions that this implementation currently depends on:

- The Content Loader API replaces the async `schema` property pattern with the Astro 6 schema creation contract.
- Astro 6 support requires Node 22.12.0 or later.
- Astro 6 upgrades to Zod 4, which affects how schema definitions should be expressed even when the parsed output shapes remain the same.
- `getImage()` is explicitly server-only, which makes the contract around `fileToImageAsset` more important to document and preserve.

This is a cross-cutting change because it touches the loader contract, runtime metadata, exported schemas, CI, and user documentation. The repo also has no executable tests today, so this change must include enough verification scaffolding to reduce the risk of shipping a broken major release.

## Goals / Non-Goals

**Goals:**

- Ship a clean Astro 6-compatible major release of the package.
- Preserve the existing external behavior of the loader wherever Astro 6 does not require a change.
- Keep dynamic schema generation, incremental loading, rendered HTML output, heading extraction, and image asset import behavior intact.
- Keep exported schema helpers and formatter utilities usable in Astro 6 projects.
- Update package metadata, CI, and documentation so the published contract matches reality.
- Add enough automated verification to validate the Astro 6 loader contract and the most fragile compatibility points.

**Non-Goals:**

- Maintaining first-class Astro 5 support in the same release line.
- Replacing the current block-based rendering pipeline with Notion's markdown endpoint.
- Redesigning the package API beyond changes strictly required for Astro 6 compatibility.
- Expanding the schema system to cover new Notion property types unrelated to the Astro 6 upgrade.

## Decisions

### 1. Target Astro 6 only in the upgraded release

The upgraded package will explicitly target Astro 6 rather than attempting to support both Astro 5 and Astro 6 in one implementation.

The package will declare an Astro peer dependency range of `>=6 <7`.

Rationale:

- The loader contract change is core to package initialization, not an isolated edge case.
- A dual-support layer would increase complexity in code, typing, CI, and documentation.
- This package is already small and specialized, so a clean major-version boundary is preferable to compatibility shims.

Alternatives considered:

- Keep Astro 5 and Astro 6 support in one code path. Rejected because the divergent loader API would create extra branching and weaker guarantees.
- Keep the package on Astro 5 until a larger refactor is ready. Rejected because it leaves the package behind the current Astro release and blocks maintainers from modernizing the support contract.

### 2. Preserve current loader semantics while swapping to Astro 6's schema creation contract

The implementation will adapt `notionLoader` to Astro 6's loader shape but will preserve the current dynamic schema behavior: retrieve database metadata from Notion, derive a Zod schema, and expose the same page data and rendered output semantics.

Rationale:

- Consumers rely on inferred collection data and current rendered entry behavior.
- The value of this change is compatibility, not a functional redesign.
- Preserving output semantics reduces migration effort for downstream Astro sites.

Alternatives considered:

- Rework schema generation and entry storage while upgrading. Rejected because it would mix migration work with unrelated behavior changes.

### 3. Preserve exported schema shapes while updating Zod usage for Astro 6

The schema system will continue to export the same conceptual validators and transformed value shapes, but internal schema expressions will be updated where necessary to align with Astro 6's `astro/zod` environment.

Rationale:

- Users of `notionPageSchema`, `propertySchema`, and `transformedPropertySchema` expect those helpers to remain stable.
- Most of the Astro 6 impact here is implementation-level compatibility rather than desired user-visible behavior change.

Alternatives considered:

- Use this release to redesign exported schema helpers. Rejected because it would introduce unnecessary migration surface.

### 4. Treat `fileToImageAsset` as an explicitly server-only helper

The package will retain `fileToImageAsset`, but the v6 support work will make its intended usage explicit: server-side build, loader, or other server execution contexts only.

Rationale:

- The helper remains useful for cover images and custom integrations.
- Astro 6 now makes the server-only boundary around `getImage()` more explicit.
- Removing the helper would be a separate product decision, not a compatibility requirement.

Alternatives considered:

- Remove `fileToImageAsset` entirely. Rejected because existing consumers may rely on it and a documentation clarification is sufficient for the Astro 6 change.

### 5. Do not fold the Notion markdown endpoint into this change

The Astro 6 change will keep the current block-fetching and HTML rendering pipeline intact. Investigation of the Notion markdown endpoint remains a follow-up change.

Rationale:

- The current renderer depends on recursive block retrieval, `notion-rehype-k`, heading extraction, and custom image rewriting.
- The markdown endpoint introduces separate product and architectural questions, including unknown block handling and fallback behavior.
- Combining both efforts would make regressions harder to localize.

Alternatives considered:

- Use the Astro 6 work as an opportunity to replace rendering with markdown retrieval. Rejected because it materially changes the rendering contract and increases delivery risk.

### 6. Upgrade the Notion SDK in the same change

The Astro 6 support change will include upgrading `@notionhq/client` if needed to keep the package and local development workflow in a healthy state.

Rationale:

- The current SDK version is significantly behind current releases.
- Making the Astro 6 line current on both Astro and the Notion SDK reduces follow-up compatibility churn immediately after the major upgrade.
- If SDK-related fixes are required to keep the branch building or typed correctly, handling them in the same change is lower risk than knowingly landing on stale dependencies.

Alternatives considered:

- Defer the Notion SDK upgrade to a separate change. Rejected because it would likely create avoidable cleanup work immediately after the Astro 6 migration.

### 7. Start with targeted unit tests rather than an integration fixture project

The first verification pass will add targeted automated tests around loader creation, dynamic schema generation, and helper behavior instead of introducing a full in-repo Astro fixture project.

Rationale:

- The repo currently has no tests, so focused coverage is the fastest way to reduce regression risk.
- The main compatibility risks for this change are concentrated in loader contract shape, schema creation, and formatter behavior.
- A fixture project can still be added later if targeted tests prove insufficient.

Alternatives considered:

- Add a full fixture project now. Rejected because it increases setup cost for the first pass.
- Add both targeted tests and a fixture project in this change. Rejected because it broadens the change without being necessary to get initial Astro 6 confidence.

## Risks / Trade-offs

- [Astro 6 loader contract differs from current assumptions] -> Add focused verification around loader creation, schema generation, and stored entry shape before release.
- [Zod 4 compatibility changes may alter validation edge cases] -> Preserve existing parsed output shapes and add targeted tests for URL/date/datetime-heavy schemas.
- [Raising Node and Astro baselines is a breaking change for current users] -> Ship as a major release and document the new support matrix and migration path clearly.
- [No existing tests increase regression risk] -> Add minimal but meaningful automated coverage as part of the upgrade instead of treating testing as follow-up work.
- [`fileToImageAsset` can still be misused in client code by consumers] -> Document the server-only contract clearly in README and API guidance.

## Migration Plan

1. Update package metadata to the Astro 6, Node 22, and refreshed Notion SDK support baseline.
2. Adapt the loader implementation to Astro 6's schema creation contract.
3. Update schema helpers for Astro 6 / Zod 4 compatibility while preserving output semantics.
4. Refresh documentation and examples to remove stale Astro 5 and legacy guidance.
5. Update CI to run on a supported Node version and validate the upgraded package.
6. Add and run targeted automated verification covering the loader contract, schema helpers, and image formatter helper.
7. Publish the change as the next major version.

Rollback strategy:

- If the upgraded line proves unstable before release, revert the feature branch or abandon the change before publish.
- If issues are found after release, patch the new major line or direct users who need older runtimes to the previous Astro 5-compatible release line.

## Open Questions

None currently.
