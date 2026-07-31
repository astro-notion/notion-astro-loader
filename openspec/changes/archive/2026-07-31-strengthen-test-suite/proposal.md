## Why

The package relies on one mixed-purpose Vitest file for most runtime confidence, leaving loader lifecycle, real rendering, and image download behavior weakly protected. A focused suite is needed before these integration-heavy paths can evolve safely.

## What Changes

- Split runtime tests by broad responsibility while preserving existing compatibility coverage.
- Add service-independent fixture coverage for loader lifecycle, recursive rendering, image metadata, downloads, caching, and path handling.
- Add coverage reporting as a diagnostic without enforcing an initial percentage threshold.
- Add a pull-request and default-branch GitHub Actions workflow for formatting, type checking, Astro compatibility, runtime tests, and build verification.
- Add a weekly/manual live test that normalizes the complete `Renderer Test` page, downloads every hosted asset family, and compares the result with a reviewed snapshot.
- Make `saveImageFromAWS` reject non-successful HTTP responses before writing files, with status context that does not expose signed URLs.
- Replace `notion-rehype-k` with `@astro-notion/notion-rehype` 1.2.0 so representative live pages render valid HAST through the existing KaTeX pipeline.
- Treat hosted PDF blocks like other downloadable Notion assets so complete representative pages render successfully.
- Normalize missing HAST element properties before KaTeX so list-bearing Notion pages render through the complete processor.
- Add an on-demand, gitignored browser preview that keeps downloaded assets beside the rendered HTML without uploading preview artifacts from GitHub Actions.

## Capabilities

### New Capabilities

- `test-verification`: Defines service-independent runtime tests, coverage reporting, pull-request CI, and isolated live Notion golden-page verification.

### Modified Capabilities

- `image-handling`: Requires hosted image downloads to reject non-successful HTTP responses safely before writing content.

## Maintainer Input Gate

Implementation MUST stop before generating the canonical snapshot or running live Notion verification and ask the maintainer to confirm that:

- `NOTION_TEST_TOKEN` and `NOTION_TEST_DATA_SOURCE_ID` are available in the apply-session environment.
- The fixture is still identified by title property `Title`, page title `Renderer Test`, and marker `astro-notion-loader-smoke`.
- The page still contains permanent Notion-hosted image, file, video, and audio blocks.
- Any additional identifier discovered during implementation, including a direct page ID, has been provided or approved.

The agent MUST NOT ask for secret values in chat or persist them in repository files. It must ask the maintainer to configure the environment and confirm readiness, then wait for that confirmation before continuing live verification.

## Impact

- Affects `tests/`, package test scripts and development dependencies, GitHub Actions workflows, and contributor documentation.
- Requires repository owners to provision a dedicated Notion fixture and secrets before generating and verifying the reviewed live snapshot.
- Changes `src/image.ts`, internal renderer asset handling, the renderer dependency import, and package dependencies; public types and exports remain unchanged.
