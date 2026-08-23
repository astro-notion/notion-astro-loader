## 1. Regression Coverage

- [x] 1.1 Add a renderer test that forces processing to fail and verifies the operation-context log and rejection with the original error.
- [x] 1.2 Add loader tests proving a failed update preserves the complete existing entry and a failed first render creates no entry.

## 2. Failure Propagation

- [x] 2.1 Change `NotionPageRenderer.render()` to rethrow rendering errors after logging and narrow its return type to a successful `RenderedNotionEntry`.
- [x] 2.2 Tighten the loader's successful render continuation so the store write and asset imports require a completed render while failed pages retain their prior or absent store state.

## 3. Verification

- [x] 3.1 Run the focused renderer and loader tests and confirm both failure and success paths pass.
- [x] 3.2 Run source formatting, type checking, Astro 6 and Astro 7 compatibility tests, the full runtime suite, and the package build in CI order.
