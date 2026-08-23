## Why

Page rendering currently converts errors into `undefined`, after which the loader stores the page's new digest as though rendering succeeded. A transient Notion or rehype failure can therefore replace valid rendered content or leave a new entry without rendered content, and later loads will skip recovery until the page changes or cache bypass is forced.

## What Changes

- Make page rendering reject after logging an operation-context error instead of returning `undefined`.
- Update the loader only after rendering succeeds, preserving an existing entry and its prior digest when rendering fails.
- Ensure a failed first render does not create a store entry.
- Add regression tests for renderer rejection and loader store behavior across update and creation failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-rendering`: Change render failure behavior from returning `undefined` to rejecting with the rendering error after logging it.
- `notion-loader`: Require failed renders to leave the store unchanged so digest caching retries the page on the next load.

## Impact

- Affected code: `src/render.ts`, `src/loader.ts`, and focused renderer and loader tests.
- API behavior: `NotionPageRenderer.render()` no longer resolves to `undefined` on failure; the public `notionLoader()` propagates rendering failures instead of caching an incomplete entry.
- Dependencies and package exports remain unchanged.
