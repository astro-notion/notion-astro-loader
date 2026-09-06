## Context

See `proposal.md` for motivation. Current state (verified against `src/loader.ts:145-226`, `src/render.ts:296-327`):

- Changed pages queue `renderer.render()` into `renderPromises`, then `await Promise.all(renderPromises)`. The first rejection discards other pages' successful renders and rejects the whole `load()`.
- `getPageData` / `parseData` throw inside the `for-await` pagination loop, leaving already-queued render promises floating unawaited, skipping remaining pages and skipping deletions.
- Successful pages that already called `store.set` before the throw leave partial writes.

Approved direction: fail-fast but hardened — keep sync failing loudly on page errors, but attempt everything first and report all failures at once. See `specs/notion-loader/spec.md` for the behavioral contract.

## Goals / Non-Goals

**Goals:**

- Attempt every page in the data-source pagination regardless of earlier per-page failures.
- Guarantee no floating promises: one page's failure never aborts the loop and never leaves unawaited work.
- Preserve failed pages for retry and still attempt deletions, then fail loudly with a single aggregated error.
- Keep the existing retry contract: unchanged digest = skip, changed digest + success = commit, changed digest + failure = preserve + retry.

**Non-Goals:**

- Best-effort / warn-and-continue sync that exits zero with broken pages (explicitly rejected; sync must still go red).
- Per-page retry within a single sync, concurrency tuning, or parallel render scheduling.
- Changes to `NotionPageRenderer.render()` error contract (it already logs and rethrows).

## Decisions

### 1. Per-page try/catch covers the full per-page unit

Wrap `getPageData` + `parseData` + `render` + `store.set` for each page in its own try/catch inside the pagination loop. `store.set` moves inside the guarded region so a failure before or during render cannot write a partial entry.

- Alternative considered: catching only `render()` — rejected because `getPageData` / `parseData` throws are the cases that today abort the loop and strand queued promises; they must be isolated too.

### 2. No fire-and-forget push; await inline sequentially

Await each page's render inline sequentially within its try/catch iteration (remove the `renderPromises` + trailing `Promise.all` pattern).

- Alternative considered: collect promises and `await Promise.allSettled` with proper awaiting — also satisfies "no floating promises", and preserves concurrent rendering. Acceptable if the implementer prefers it, but sequential inline await is preferred for simplicity: no shared mutable error collection across concurrent continuations, deterministic log order, and the smallest diff from the current loop. Either way, every queued promise MUST be awaited before the aggregated throw; fire-and-forget `push` without awaiting is forbidden.

### 3. Failure preserves store entry and digest, logs with page context, collects the error

On per-page catch: do not call `store.set` and do not write a digest, so the prior entry (or absence) is untouched and the page retries next sync. Log the error via the existing forked per-page logger (`log.fork(<label>/<pageId.slice(0, 6)>`) with page-id context, and push `{ pageId, error }` onto a loop-scoped collection.

### 4. Deletions run before error aggregation

Order: (a) page loop attempting every page, (b) deletion pass for store ids absent from the API response, (c) aggregated throw. Deletions are therefore still attempted even when some renders failed, and the throw happens only after all pages + deletions have been attempted. Deletion errors follow existing behavior (not swallowed by page-error aggregation).

### 5. Single aggregated throw with per-page ids and causes

After pages + deletions, if the collected error list is non-empty, throw one `Error` whose message lists each failed page id and its cause message. This keeps `astro sync` / build red while making all broken pages visible in a single run instead of one-at-a-time.

### 6. Retry contract unchanged

- Unchanged digest (and no `FORCE_RERENDER`) = skip, no render.
- Changed digest + success = `store.set` with new digest, data, rendered HTML, virtual `filePath`, and `assetImports`.
- Changed digest + failure = preserve prior entry/digest (or no entry for new pages), so the next load retries. The aggregated throw does not commit anything for failed pages.

## Risks / Trade-offs

- [Risk] Slower red feedback on huge data sources (all pages attempted before throwing) → Mitigation: accepted; full signal in one run outweighs fast-first-failure, and unchanged pages still skip cheaply via digest.
- [Risk] Aggregated message grows with many failures → Mitigation: one line per failed page id + cause; no dumps of page bodies or secrets.
- [Risk] Sequential inline await loses render concurrency → Mitigation: acceptable for correctness-first fix; `allSettled` remains an approved alternative if profiling justifies it.
- [Risk] Partial-asset side effects (downloaded files) may exist for a failed page even though no store entry is written → Mitigation: out of scope; store/digest preservation already guarantees retry, matching current asset behavior.

## Migration Plan

- Loader-only change; no config or schema changes. Next sync after upgrade either succeeds (unchanged behavior) or fails with the new aggregated message listing every broken page id — fix all listed pages, re-sync.
- Rollback: revert `src/loader.ts` to the `Promise.all` implementation; store format is unchanged so no data migration is needed.

## Open Questions

None.
