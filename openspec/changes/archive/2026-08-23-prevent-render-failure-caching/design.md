## Context

`NotionPageRenderer.render()` catches block-fetching and rehype errors, logs them, and resolves to `undefined`. The loader treats that resolution as success and writes an entry with the page's current `last_edited_time` digest. Because incremental loading skips matching digests, the failed page is not retried during later loads unless Notion edits it or `FORCE_RERENDER` is set.

The loader already delays each page's `store.set()` until its render promise resolves. The failure is therefore caused by the renderer converting rejection into a successful `undefined` result rather than by the store-write ordering.

## Goals / Non-Goals

**Goals:**

- Preserve the original store entry and digest when an updated page cannot render.
- Avoid creating an entry when a page's first render fails.
- Propagate the original rendering error after logging operation context.
- Keep successful rendering, concurrent page processing, and incremental caching unchanged.

**Non-Goals:**

- Retrying Notion requests or rehype processing within one load.
- Making the complete multi-page load transactional; other pages may complete successfully before one page rejects.
- Changing asset-level fallback behavior, `FORCE_RERENDER`, or the public loader configuration.

## Decisions

### Reject from the renderer after logging

`NotionPageRenderer.render()` will log the existing `Failed to render` message and rethrow the original error. Its return type will become `Promise<RenderedNotionEntry>` rather than allowing `undefined`.

This keeps diagnostic context at the rendering boundary while preserving the original error identity and stack for callers. Returning a status union was considered, but it would retain a successful promise path that every caller must remember to reject before updating cache state.

### Commit each page only after a successful render

The loader will continue placing `store.set()` in the render promise's successful continuation. With renderer failures rejecting, the continuation cannot store `data`, `rendered`, `assetImports`, or the new digest for the failed page. An existing entry remains available, while a new page remains absent and is retried on the next load.

Deleting the existing entry before attempting an update was considered and rejected because it would discard the last known-good content during a transient external failure.

### Preserve per-page rather than whole-load atomicity

The loader will still process changed pages concurrently and await them as a group. If one render rejects, already completed pages remain committed and in-flight pages may still complete. Rolling back successful pages would require a transaction abstraction that Astro's content store does not provide and is unnecessary to prevent failed-page cache poisoning.

## Risks / Trade-offs

- [A single page failure now rejects the loader run instead of allowing an incomplete sync to appear successful] -> Preserve the original error and operation-context log so the failure is visible and actionable.
- [Concurrent successful pages can still update the store before another page fails] -> Define atomicity per page and retain the existing concurrency model.
- [Consumers that implicitly relied on a failed page producing `rendered: undefined` will observe a rejected load] -> Treat this as correction of invalid cache behavior; `NotionPageRenderer` is not a package export and the public loader promises rendered Notion entries.

## Migration Plan

No consumer migration or data migration is required. Existing incomplete entries recover on the next page edit or a forced rerender before this fix; after upgrading, future failed renders retain the prior digest and retry naturally on the next load.

Rollback consists of restoring the previous renderer catch behavior and optional return type, though doing so reintroduces failed-render cache poisoning.

## Open Questions

None.
