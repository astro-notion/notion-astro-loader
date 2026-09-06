## 1. Loader hardening

- [ ] 1.1 Wrap per-page `getPageData` + `parseData` + `render` + `store.set` in per-page try/catch in `src/loader.ts` `load()`, removing the fire-and-forget `renderPromises` + trailing `Promise.all` pattern (await inline sequentially or `allSettled` with full awaiting), and verify no floating promises remain by code inspection.
- [ ] 1.2 On per-page failure preserve prior store entry and digest (no `store.set`, no digest write), log via the forked per-page logger with page-id context, collect `{ pageId, error }`, still attempt deletions for API-absent pages before throwing, then throw a single aggregated error listing each failed page id and cause, and verify `load()` rejects with the aggregated message on a forced render failure.

## 2. Tests

- [ ] 2.1 Add mixed 3-page batch test (A-ok / B-render-fail / C-ok) in `tests/loader.test.ts` committing A+C, preserving B's prior entry, and throwing an aggregated error mentioning B, and verify with `pnpm exec vitest run tests/loader.test.ts`.
- [ ] 2.2 Add mid-loop `getPageData` throw test proving C is still processed and deletions for API-absent pages are still attempted with no floating promises (e.g. assert on settled state / unhandled rejections), and verify with `pnpm exec vitest run tests/loader.test.ts`.
- [ ] 2.3 Add digest-preservation test proving a failed render never writes a digest so the next `load()` retries the page, and verify with `pnpm exec vitest run tests/loader.test.ts`.

## 3. Docs and verification

- [ ] 3.1 Add migration-guide note about the fail-fast aggregated behavior (sync still fails, but reports all broken pages at once), and verify the note renders in the migration guide.
- [ ] 3.2 Run formatting, typecheck, tests, and build in CI order and verify all pass.
