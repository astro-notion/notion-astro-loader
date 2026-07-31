## 1. Test Foundation

- [x] 1.1 Add Vitest V8 coverage tooling and a `test:coverage` script that reports line and branch coverage without thresholds; verify the command exits successfully.
- [x] 1.2 Move existing loader cases into `tests/loader.test.ts`, adding only fixture helpers reused by multiple scenarios; verify the moved cases pass in isolation.
- [x] 1.3 Split the remaining schema, rehype, and image asset cases by broad responsibility; verify all 12 baseline tests remain represented and pass.

## 2. Loader Lifecycle Contracts

- [x] 2.1 Add loader tests for new, changed, unchanged, forced, removed, and partial pages, asserting store entries, deletions, digests, virtual paths, parsed data, and `assetImports`.
- [x] 2.2 Add parse and render rejection tests that verify no invalid replacement entry is stored, without introducing a new loader error contract.

## 3. Rendering Contracts

- [x] 3.1 Add renderer tests that execute the real unified processor for compact recursive and representative asset-bearing blocks, asserting semantic HTML, headings, and image metadata.
- [x] 3.2 Add page-data tests for representative local/external covers and icon types, asserting stable data and path semantics without an exhaustive cross-product.

## 4. Image Boundaries

- [x] 4.1 Add temporary-filesystem tests for successful image downloads, cache hits, forced refreshes, missing directories, malformed URLs, and returned relative paths, restoring all mutable state.
- [x] 4.2 Add a failing test proving a non-successful response is not consumed or written, does not replace a cached image, includes HTTP status, and omits the signed URL.
- [x] 4.3 Update `saveImageFromAWS` to validate `Response.ok` before consuming the body, then make the response failure test pass.

## 5. Continuous Integration

- [x] 5.1 Add a GitHub Actions workflow for pull requests and default-branch pushes that installs with pnpm caching and runs formatting, type checking, Astro 6/7 compatibility, runtime tests, and build verification in documented order.
- [x] 5.2 Add a separately invoked live test that validates `NOTION_TEST_TOKEN` and `NOTION_TEST_DATA_SOURCE_ID`, selects `Renderer Test` through property `Title`, and requires marker `astro-notion-loader-smoke`.
- [x] 5.3 Render the complete live page, require successful hosted image/file/video/audio downloads, and normalize signed URLs, temporary roots, timestamps, and path separators with tests proving sensitive values cannot enter snapshots.
- [x] 5.4 Add a weekly/manual workflow and document least-privilege fixture, secret, normalization, and snapshot-review procedures; ensure pull-request workflows never invoke it.
- [x] 5.5 Replace `notion-rehype-k` with `@astro-notion/notion-rehype` 1.2.0, normalize list HAST before KaTeX, support hosted PDF blocks through the existing asset path, then with credentials injected into the apply-session environment generate the normalized baseline, review its complete contents for correctness and sensitive values, and commit the canonical snapshot without persisting secret values.
- [x] 5.6 Add an on-demand `test:live:preview` command that writes gitignored browser-readable HTML and colocated assets without adding a GitHub Actions artifact upload.

## 6. Final Verification

- [x] 6.1 Run formatting, `pnpm typecheck`, `pnpm test:compat`, `pnpm test`, `pnpm test:coverage`, and `pnpm build`; confirm normal verification needs no Notion credentials and coverage has no threshold.
- [x] 6.2 Validate the OpenSpec change and review the final test inventory against every delta-spec scenario, including one successful manual live snapshot comparison after owner-provided credentials are available.
