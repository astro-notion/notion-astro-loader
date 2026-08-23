## Context

`buildProcessor()` currently creates one mutable `headings` variable and one table-of-contents callback for the lifetime of the shared page processor. The loader starts rendering every updated page before awaiting the render promises, so an asynchronous custom rehype plugin can suspend one page after its table of contents is extracted while another page overwrites the shared heading state.

The fix must preserve concurrent rendering, the existing rehype plugin order, and the `RenderedNotionEntry` contract without introducing a dependency or public API change.

## Goals / Non-Goals

**Goals:**

- Give each processor invocation independent heading state.
- Preserve asynchronous custom rehype plugin support and concurrent page rendering.
- Add a deterministic regression test that fails when heading state is shared.

**Non-Goals:**

- Serializing page rendering.
- Changing heading depth, text, or slug extraction semantics.
- Changing the custom rehype plugin API or rendered output shape.
- Addressing unrelated render failure caching behavior.

## Decisions

### Construct the table-of-contents processor per invocation

Resolve the configured plugin list once, but create the processor branch, table-of-contents callback, and `headings` variable inside each returned `process()` invocation. This preserves plugin loading behavior while ensuring no mutable metadata state crosses render boundaries.

The alternative of serializing processor calls would hide the race at the cost of loader throughput and would unnecessarily constrain asynchronous plugins. Attaching headings to module-level or processor-level state would retain the same ownership ambiguity. Per-invocation ownership directly matches the lifetime of the returned metadata.

### Exercise overlap with an explicitly controlled asynchronous plugin

Add a renderer test that starts a first page render, blocks it in an asynchronous custom plugin after table-of-contents extraction, processes a second page, and then releases the first render. Explicit synchronization keeps the regression deterministic and avoids timing-dependent sleeps.

The test will assert both HTML output and heading metadata so it proves that processor behavior remains correct while metadata is isolated.

## Risks / Trade-offs

- [Risk] Building a processor branch for every updated page adds small setup overhead. -> Reuse the resolved plugin modules and keep page rendering concurrent; network block retrieval and asset processing remain the dominant work.
- [Risk] A concurrency test can become flaky if it depends on scheduler timing. -> Coordinate plugin progress with promises rather than elapsed time.
- [Risk] Moving processor construction may accidentally alter plugin ordering. -> Assert async custom plugin execution and rendered HTML through the existing real processor path.

## Migration Plan

This is an internal bug fix with no consumer migration. Release the corrected processor and regression test together; rollback is a normal commit revert if compatibility verification detects a regression.

## Open Questions

None.
