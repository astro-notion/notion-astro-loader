## Why

The live Notion golden-page test constructs the renderer without a public asset destination, then incorrectly expects hosted documents and media to appear in image-only metadata. The documented weekly and manual verification therefore cannot validate the intended split between Astro-processed images and directly served public assets.

## What Changes

- Configure live verification with separate temporary destinations for source images and public assets.
- Verify hosted images through image metadata and verify hosted files, video, and audio through their public URLs and downloaded files.
- Preserve complete-page rendering, fixture inventory, secret redaction, snapshot comparison, and preview behavior.
- Add service-independent regression coverage for the live asset assertion contract where practical.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-verification`: Clarify that live verification validates source images through Astro image metadata while validating non-image assets through public output paths and URLs.

## Impact

- Affects `tests/live/notion.test.ts` and focused live-verification tests.
- May adjust live preview setup to accept distinct source-image and public-asset roots.
- Does not change the package's public API, runtime renderer behavior, dependencies, or normal pull-request CI requirements.
