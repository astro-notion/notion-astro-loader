## Context

See proposal.md (Why) for motivation. Current state shaping this design:

- `NotionLoaderOptions` in `src/loader.ts:44-53` declares `experimentalCacheImageInData?: boolean` (default `false`, applied at `src/loader.ts:101`) and `experimentalRootSourceAlias?: string` (default `'src'`, applied at `src/loader.ts:102`). Both flow into a single call, `renderer.getPageData(cacheFlag, rootAlias)` at `src/loader.ts:188`.
- `NotionPageRenderer.getPageData(transformCoverImage, rootAlias)` in `src/render.ts:232` already generalizes beyond images: the flag gates cover/icon localization, icon fetching, and hosted `files`-property localization. No signature or behavior change is needed there; only the option value flows in.
- The codebase already ships an alias-translation precedent: the deprecated public `archived` option is translated to the SDK's `in_trash`, with explicit `in_trash` winning (`src/loader.ts:129-130`), covered by the compatibility suite. The new alias resolution mirrors that pattern.
- Docs referencing the current names: `README.md` Options section (line 126) and Advanced Utilities (line 140), `docs/migrations/2.0.md` section 6 (line 143), `docs/releases/2.0.0.md` Changed (line 25). Existing spec text references the old name in `openspec/specs/page-rendering/spec.md:122-133`.

## Goals / Non-Goals

**Goals:**

- Give the asset-cache options stable canonical names before v2 stable without breaking existing consumers.
- Define unambiguous resolution precedence and a visible deprecation path for the old names.
- Keep the renderer, destinations, and defaults untouched.

**Non-Goals:**

- Changing asset behavior, destinations, defaults, or the `getPageData` transform path.
- Removing the `experimental*` aliases in this change (removal belongs to the next major).
- Deciding the fate of any other `experimental` surface; this change covers only these two options.

## Decisions

### Canonical names: `cacheImageInData` / `rootSourceAlias`

Adopt the proposal's default names, stripping the `experimental` prefix and nothing else. Rationale: minimal rename keeps the docs/spec diff mechanical and preserves the existing test and grep vocabulary (`cacheImageInData`, `rootSourceAlias` remain searchable substrings of the old names). Alternative considered: broader renames such as `localizePageAssets` / `sourceAlias` — rejected because they expand the review surface (every doc, spec, and test reference must be re-worded, not just de-prefixed) with no behavior gain.

### Resolution and precedence in `notionLoader` option handling

Resolve both options at the top of `notionLoader`, following the `archived` → `in_trash` precedent: the canonical field wins when defined; otherwise the legacy alias maps onto it; otherwise the existing default applies (`false` / `'src'`). Explicit-`undefined` canonical with a defined alias falls back to the alias (same `!== undefined` check style as line 130). The resolved canonical values are the only ones forwarded to `getPageData`. Alternative considered: resolving inside the renderer — rejected because `src/loader.ts` owns option handling per the repo's module responsibilities, and the renderer takes positional transform arguments, not loader options.

### Deprecation warnings via the loader logger

Emit a deprecation warning through the Content Layer `logger` available in `load()` when a legacy alias supplies a value the canonical option did not — naming the alias and its canonical replacement. Rationale: the logger is the loader's established user-facing channel (per-fork page loggers already exist), and warning at use-site avoids noise for consumers already on the canonical names. Note: option resolution happens in `notionLoader()` before the Astro `logger` exists, so the warning must fire inside `load()` where `ctx.logger` is available, or the resolution must record "alias was used" for `load()` to report. Alternative considered: `console.warn` at call time — rejected because it bypasses Astro's log levels/formatting and fires even when the loader never runs.

### Docs updates

Update all four existing references to present the canonical names as primary and the `experimental*` names as deprecated aliases: `README.md` Options bullet and Advanced Utilities paragraph, `docs/migrations/2.0.md` section 6, and `docs/releases/2.0.0.md` Added/Changed lines (new-name announcement under Added, alias-compatibility note under Changed). Alternative considered: documenting only the new names and deleting the old — rejected because the aliases remain accepted for a full major and undiscoverable-but-working options are worse than documented deprecated ones.

### Tests in `tests/loader.test.ts` plus compat-suite note

Add focused tests for: canonical-name-enables behavior, new-name-wins when both are supplied, and old-alias-still-works with identical `getPageData` arguments (asserted via the existing `NotionPageRenderer.prototype.getPageData` spy pattern). Record the alias behavior in the compatibility suite alongside the existing `archived` → `in_trash` translation coverage so the one-major support promise is pinned. Alternative considered: table-driven resolution unit tests detached from the loader — rejected because the spy-based tests already capture the externally visible contract (what reaches the renderer) with the least new harness.

## Risks / Trade-offs

- [Risk] Both-names-supplied silently ignoring the alias could surprise users who set the alias globally and the canonical name once → Mitigation: precedence is documented in README Options and the deprecation warning fires only when the alias is the effective source, so the ignored-alias case is the explicit-override case, matching `in_trash`-over-`archived` expectations.
- [Risk] Deprecation warning inside `load()` fires per sync rather than per config definition → Mitigation: acceptable; loader `load()` logging is already per-sync, and gating on alias-actually-used keeps it quiet for migrated consumers.
- [Risk] Recommending path A late in release prep could slip 2.0.0 → Mitigation: the change is additive and non-breaking (new fields + alias mapping + docs + tests); if review deems it too late, the proposal's fallback (B: explicit experimental contract) reuses the same docs/test slots with a smaller diff.

## Migration Plan

Ship in 2.0.0 as additive: canonical names work, aliases work with a warning, defaults unchanged — no consumer migration required. Remove the aliases in the next major, at which point the deprecation warnings and the compat-suite alias tests are deleted together.

## Open Questions

None. The fallback to path B is a review decision, not an implementation unknown: it changes which diff lands, not how the specs, design, or tasks are structured.
