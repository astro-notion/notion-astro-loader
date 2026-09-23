## 1. Loader option handling

- [x] 1.1 Add canonical `cacheImageInData` and `rootSourceAlias` fields to `NotionLoaderOptions` in `src/loader.ts`, keep the `experimental*` fields marked `@deprecated`, and implement new-wins/alias-maps/defaults resolution; verify with `pnpm typecheck`.
- [x] 1.2 Forward only the resolved canonical values to `renderer.getPageData` in `src/loader.ts` and verify the existing loader tests pass with `pnpm exec vitest run tests/loader.test.ts`.

## 2. Deprecation logging

- [x] 2.1 Emit a deprecation warning via the Content Layer logger inside `load()` when a legacy alias supplies a value the canonical option did not, naming the alias and its replacement; verify by configuring only the alias in a loader test and asserting the warning is logged.

## 3. Docs updates

- [x] 3.1 Update `README.md` Options section and Advanced Utilities paragraph to document the canonical names as primary and the `experimental*` names as deprecated aliases; verify by grepping that no undocumented `experimental*` reference remains in `README.md`.
- [x] 3.2 Update `docs/migrations/2.0.md` section 6 and `docs/releases/2.0.0.md` Added/Changed lines for the rename and alias-compatibility promise; verify by rendering the migration guide section and confirming both names appear with precedence stated.

## 4. Tests and compatibility

- [x] 4.1 Add `tests/loader.test.ts` cases for new-name-wins precedence (both supplied, canonical reaches `getPageData`) and old-alias-still-works (alias-only config produces identical `getPageData` arguments); verify with `pnpm exec vitest run tests/loader.test.ts`.
- [x] 4.2 Add a compat-suite note pinning the one-major alias support alongside the existing `archived` → `in_trash` translation coverage; verify with `pnpm test:compat`.
