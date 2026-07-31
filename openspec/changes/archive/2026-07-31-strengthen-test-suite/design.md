## Context

The package sits between external Notion payloads and Astro's Content Layer and asset pipeline. Its 12 runtime tests share one compatibility-focused file; the real renderer, recursive blocks, stale-entry cleanup, and image download paths have little direct coverage. Compile-only and packed-package checks already cover Astro 6 and Astro 7 consumers.

Pull-request tests must work without repository secrets. A separate live Notion check can detect external drift, but it must not run as part of normal pull-request verification.

## Goals / Non-Goals

**Goals:**

- Protect loader lifecycle, recursive rendering, and image download contracts.
- Preserve representative schema, rehype, and `astro:assets` compatibility coverage.
- Exercise real internal pipelines while replacing external boundaries.
- Add diagnostic coverage, pull-request CI, and an isolated live golden-page test.
- Reject non-successful hosted image responses before writing content.

**Non-Goals:**

- Exhaustively cover every Notion property or rendering variant.
- Add an initial coverage threshold.
- Make the live test a pull-request gate.
- Change public package types or exports.
- Test, modify, or remove the unused `src/asset.ts`; that cleanup is a separate decision.

## Decisions

### Organize tests by broad behavior

Separate loader, renderer, and image behavior from compatibility assertions. Keep fixtures next to a test until reuse justifies a shared fixture module. This avoids both the current mixed-purpose file and a speculative hierarchy of small helpers.

### Run real internals behind controlled boundaries

Use the real loader flow, unified renderer, schemas, rehype plugins, and filesystem. Fake Notion responses, stub `fetch`, and mock server-only `astro:assets`. Assert stored entries, semantic HTML, headings, and image metadata instead of internal call sequences or large snapshots.

### Isolate mutable state and validate image responses

Use a fresh temporary directory for image tests and restore `FORCE_RERENDER`, the working directory, global `fetch`, and module mocks after each scenario. `saveImageFromAWS` will check `Response.ok` before consuming the body; failures will include HTTP status but omit the signed URL.

### Report coverage and run pull-request CI

Add a V8 coverage command without thresholds. Add a GitHub Actions workflow that runs the documented quality commands for pull requests and default-branch pushes. Whether that workflow is a required status check remains a repository branch-protection setting, not a claim enforced by this change.

### Keep live golden-page verification separate

Run the live test only on a weekly schedule or manual trigger with `NOTION_TEST_TOKEN` and `NOTION_TEST_DATA_SOURCE_ID`. Query the dedicated data source for title property `Title` equal to `Renderer Test`, then require marker `astro-notion-loader-smoke` before comparing output.

The fixture will contain hosted image, file, video, and audio blocks. The test will render the complete page, verify each hosted asset downloads, and normalize only known volatile values such as signed URLs, temporary roots, timestamps, and platform path separators. The committed snapshot must contain stable placeholders instead of credentials or signed URLs.

Generate the initial normalized snapshot with `NOTION_TEST_TOKEN` and `NOTION_TEST_DATA_SOURCE_ID` injected into the apply-session environment; do not pass their values through chat or repository files. Scheduled runs use GitHub Actions secrets with the same names. A maintainer must review the entire baseline for expected structure and accidental sensitive values before committing it. Future differences require the same review rather than automatic snapshot updates. This stronger golden contract is intentionally more sensitive than a semantic smoke test.

Keep visual inspection separate from the canonical snapshot. An on-demand local command writes `tests/live/output/index.html`, copies downloaded assets beneath `tests/live/output/assets/`, and restores browser-readable image sources. The output is gitignored and is not uploaded by GitHub Actions, avoiding binary repository growth and workflow artifact retention.

### Use the maintained renderer package for complete fixtures

Replace `notion-rehype-k` with `@astro-notion/notion-rehype` 1.2.0 using the same internal plugin boundary. The maintained package consumes standard Notion asset objects instead of the former dependency's URL-string adapter. Both packages can emit list elements without `properties`, while `rehype-katex` requires that object, so normalize missing element properties immediately before KaTeX. This preserves the package's public API and limits compatibility handling to the processor boundary.

The complete fixture also contains hosted PDF blocks. Include PDF payloads in the existing internal asset union and transform them through the same download path as file, image, video, and audio blocks; this avoids a PDF-specific downloader or public API.

## Risks / Trade-offs

- Fixtures can drift from Notion response types -> Type reusable fixtures against SDK response types.
- Real rendering tests are slower than mocks -> Use only representative compact pages.
- Test splitting can lose existing coverage -> Move current assertions before adding scenarios.
- Mutable state can leak between tests -> Use unconditional cleanup and restoration hooks.
- Live checks can fail for fixture or upstream changes -> Keep them separate from pull requests and require human review of snapshot differences.

## Migration Plan

1. Add coverage tooling and split existing tests without changing behavior.
2. Add loader and renderer contract tests.
3. Add image boundary tests, then implement HTTP response validation test-first.
4. Add pull-request CI and the separate live golden-page workflow.
5. Replace the internal Notion rehype dependency and verify the complete live fixture.
6. Add the local live preview without changing scheduled workflow artifacts.
7. Run the documented local quality sequence and validate the OpenSpec change.

Tests and workflows are additive and can be reverted independently. Revert the image response requirement with its implementation if that behavior proves incompatible.

## Open Questions

- Repository owners must provision the dedicated Notion fixture and secrets before the initial snapshot can be generated and reviewed.
- The unused `src/asset.ts` remains a candidate for a separate deletion change.
