## 1. Regression Coverage

- [x] 1.1 Add a deterministic renderer test that overlaps two processor invocations with an asynchronous rehype plugin and distinct headings.
- [x] 1.2 Confirm the regression test fails because the first invocation receives heading metadata from the second invocation.

## 2. Heading State Isolation

- [x] 2.1 Refactor `buildProcessor()` so each invocation owns its table-of-contents callback and heading state while configured plugins are still resolved once.
- [x] 2.2 Confirm overlapping invocations retain their own HTML and heading metadata without serializing page rendering or changing plugin order.

## 3. Verification

- [x] 3.1 Run the focused renderer tests and confirm the concurrency regression passes consistently.
- [x] 3.2 Run formatting, type checking, Astro 6/7 compatibility, the complete runtime test suite, and the package build.
