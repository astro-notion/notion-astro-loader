## Why

Version 2.0.0 is a stable major, but `notionLoader` still ships two public options with an `experimental` prefix (`experimentalCacheImageInData`, `experimentalRootSourceAlias`) whose semantics already expanded once from image-only (covers/icons) to all hosted file properties. Shipping a stable major with `experimental`-prefixed public options leaves the versioning promise ambiguous: users cannot tell whether the names, defaults, or behavior may change in a minor.

## What Changes

- Evaluate three paths for the `experimental*` loader options before v2 stable:
  - **(A) Stabilize with new canonical names** (e.g. `cacheImageInData` / `rootSourceAlias` or similar): introduce the stable names as the documented options and keep the old `experimental*` names accepted as deprecated aliases translated to the new fields for one major (explicit `in_trash`-over-`archived` style precedence: new name wins, old name maps only when the new one is absent), with a deprecation warning via the loader logger.
  - **(B) Keep the `experimental*` names** but write an explicit experimental contract: document what may change without a major (names, defaults, scope) and the versioning promise going forward.
  - **(C) Do nothing for 2.0.0** and defer the decision to a later release, accepting `experimental`-prefixed names in a stable major.
- **Recommended: (A) if cheap, else (B).** Path A is preferred because the alias-translation pattern already exists in this codebase (`archived` → `in_trash`, with explicit-wins precedence and compat-suite coverage), so the implementation cost is a small, well-understood option-resolution step plus docs and tests. If review finds the rename cost (docs churn, release-notes edits, compat coverage) exceeds its value this late in the release, fall back to (B) so that at minimum the experimental promise is explicit rather than implied.
- No change to asset behavior itself: destinations (`imageSavePath` vs `publicPath`), external-URL passthrough, and the `getPageData` transform path in `src/render.ts` stay as-is; only option naming, resolution, and documentation change.

## Capabilities

### New Capabilities

- None. No new runtime behavior is introduced; this change renames and documents existing options.

### Modified Capabilities

- `notion-loader`: loader option surface gains canonical (non-`experimental`) names for the asset-cache options, with deprecated `experimental*` aliases, new-wins precedence, and deprecation logging.
- `page-rendering`: the hosted page-property asset requirement references the option name that enables it, so its requirement text follows the rename (behavior unchanged).

## Impact

- Affected code: `src/loader.ts` option handling (resolution, precedence, deprecation warning); `src/render.ts` is behavior-unchanged (only the option value flows into the existing `getPageData` transform path).
- Public API: new canonical option names; old `experimental*` names remain accepted as deprecated aliases for one major (non-breaking under path A).
- Docs: `README.md` Options section, `docs/migrations/2.0.md` section 6, `docs/releases/2.0.0.md` Added/Changed lines.
- Tests: `tests/loader.test.ts` alias precedence and translation coverage, plus a compat-suite note for the alias behavior.
