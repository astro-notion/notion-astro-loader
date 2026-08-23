## 1. Regression Coverage

- [x] 1.1 Add a credential-free test that reproduces partial temporary-root replacement with overlapping absolute and relative paths.
- [x] 1.2 Cover reversed input order and differing parent-directory depths, asserting identical output with no traversal segments adjacent to `[TEMP_ROOT]`.

## 2. Deterministic Normalization

- [x] 2.1 Normalize configured path separators, remove duplicate temporary paths, and order replacements from longest to shortest in `normalizeLiveSnapshot`.
- [x] 2.2 Run the focused live-verification tests and the normal runtime test suite.

## 3. Canonical Snapshot

- [x] 3.1 Regenerate the live renderer snapshot with the configured Notion fixture and confirm temporary asset references use `[TEMP_ROOT]` without machine-specific prefixes.
- [x] 3.2 Review the complete snapshot for unintended rendering changes, signed URLs, credentials, absolute temporary paths, or timestamps.
- [x] 3.3 Run formatting, type checking, Astro compatibility, runtime tests, and the package build in CI order.
