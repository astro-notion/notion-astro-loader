## Why

The renderer currently shares mutable heading state across page renders, so overlapping renders can attach one page's headings to another page. This is a stable-release blocker because the loader deliberately renders updated pages concurrently and custom rehype plugins may be asynchronous.

## What Changes

- Isolate table-of-contents heading state to each processor invocation.
- Preserve concurrent page rendering and asynchronous custom rehype plugin support.
- Add regression coverage that overlaps two renders and verifies each result retains its own heading metadata.
- Keep the existing rendered output shape and public API unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-rendering`: Require heading metadata to remain isolated to the page being rendered when processing overlaps.

## Impact

- Affected implementation: `src/render.ts` processor construction and per-render metadata collection.
- Affected tests: renderer tests covering asynchronous plugins and concurrent processing.
- Public APIs, package exports, dependencies, and loader concurrency remain unchanged.
