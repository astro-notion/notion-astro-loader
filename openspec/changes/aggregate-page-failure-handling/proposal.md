## Why

The loader keeps Astro sync failing loudly on page errors (fail-fast), but the current implementation is sloppy: a single page failure aborts the pagination loop, leaves already-queued renders floating unawaited, skips remaining pages and deletions, and leaves partial store writes. Sync goes red with only one failure visible at a time, forcing repeated one-at-a-time fix cycles.

## What Changes

- Attempt every page in the data-source pagination regardless of earlier per-page failures.
- Isolate each page (`getPageData` + `parseData` + `render` + `store.set`) in per-page try/catch so one page's failure never aborts the loop and never leaves floating promises.
- On per-page failure: preserve the prior store entry and digest (no `store.set`, no digest write) so the page retries next sync; log the error with page-id context via the forked logger; collect the error.
- Still attempt deletions for pages absent from the API response even when some renders failed.
- After all pages + deletions are attempted, throw a single aggregated error listing each failed page id and its cause, so `astro sync` / build still goes red with full signal in one run.
- Keep the existing retry contract: unchanged digest = skip, changed digest + success = commit, changed digest + failure = preserve + retry.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notion-loader`: Incremental Loading requirement changes from fail-on-first-page-error (abort loop, drop queued renders, skip deletions, partial writes) to attempt-all-pages-then-throw-aggregated-error (preserve failed pages for retry, still attempt deletions, single aggregated throw).

## Impact

- `src/loader.ts` `load()`: pagination loop, per-page error isolation, deletion ordering, aggregated throw.
- `src/render.ts`: no contract change; `render()` already logs and rethrows per page.
- `tests/loader.test.ts`: new coverage for mixed-batch, mid-loop throw, digest preservation.
- Migration note (`docs/migrations/2.0.md` or v2 migration guide): fail-fast aggregated behavior — sync still fails, but now reports all broken pages at once.
