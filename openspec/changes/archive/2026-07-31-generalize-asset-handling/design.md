## Context

The original renderer treated every downloaded Notion file as an image. The current renderer supports two distinct pipelines: image-like assets are stored below `src/<imageSavePath>` and registered with Astro's image pipeline, while documents and media are stored below `publicPath` and served directly. Despite that split, the active downloader remains in `image.ts` as `saveImageFromAWS`, and separate generic modules exist without production callers.

The package already ships observable path layouts, cache behavior, diagnostics, public loader options, rendered `imagePaths` metadata, and compatibility coverage for image and non-image output. The refactor must preserve those behaviors while making the internal ownership match the current domain.

## Goals / Non-Goals

**Goals:**

- Establish `asset.ts` as the single implementation for downloading and caching Notion-hosted assets.
- Use names that describe Notion-hosted assets without coupling the operation to images or an AWS hostname.
- Preserve the separate Astro image and directly served public-asset pipelines.
- Remove unused implementations whose behavior differs from the live pipeline.
- Align focused, compatibility, documentation, and specification coverage with actual behavior.

**Non-Goals:**

- Renaming `imageSavePath`, `imagePaths`, `rehypeImages`, `fileToImageAsset`, or public experimental loader options.
- Sending non-image assets through Astro's image optimization pipeline.
- Downloading external Notion asset URLs; only Notion `file` objects are cached.
- Changing the local path layout, public URL layout, cache policy, or rendered HTML contract.
- Adding a generic public downloader export or new runtime dependency.

## Decisions

### Consolidate filesystem asset handling in `asset.ts`

`asset.ts` will replace its unused `downloadFile` implementation with the proven behavior currently implemented by `saveImageFromAWS`. The operation will use an asset-oriented name such as `saveNotionAsset`, and its options, diagnostics, and tests will use asset terminology. `VIRTUAL_CONTENT_ROOT` and the helper that resolves a virtual content path relative to `src` will live in the same module, allowing `image.ts` to be removed.

The operation remains Notion-specific rather than becoming a general URL downloader. Its cache key and output path depend on the stable path segments in a Notion-hosted file URL, so a broad name such as `downloadFile` would promise unsupported input semantics.

Alternatives considered:

- Keep the active implementation in `image.ts`: smallest diff, but preserves the core mismatch and leaves `asset.ts` ambiguous.
- Split download logic into `asset.ts` and retain a one-function `image.ts`: maintains a visual distinction but creates a shallow module for a path conversion that is structurally generic.
- Adopt the existing `downloadFile`: rejected because it has different path layout, response validation, and asynchronous write behavior.

### Model destination policy explicitly in the renderer

The renderer will continue to select between source and public destinations based on presentation semantics. Image blocks, covers, and icons use the source destination; file, PDF, video, audio, and file-property assets use the public destination. Internal parameter and helper names should express the destination policy rather than treating all downloaded content as images.

Both destinations call the same `saveNotionAsset` operation. The source destination records returned paths for `metadata.imagePaths` and Astro `assetImports`; the public destination converts filesystem-relative paths to URLs under Astro's configured base and does not add them to image metadata.

Alternative considered: one undifferentiated asset destination. Rejected because placing non-images under `src` incorrectly enrolls them in the asset import path, while placing images under `public` bypasses Astro optimization.

### Keep image processing explicitly image-specific

`rehypeImages`, `imagePaths`, `imageSavePath`, and `fileToImageAsset` remain unchanged because they represent Astro image behavior rather than generic download behavior. The renderer's generic internal asset list may retain an asset-oriented implementation name, but only source image paths are exposed through rendered image metadata during normal loader operation.

### Remove the unused generic rehype plugin

`rehype-assets.ts` and its dedicated test case will be removed. Its arbitrary `src` and `href` rewriting is not part of the live renderer, and non-image assets already receive final public URLs before rehype processing. Integrating it would introduce behavior rather than simplify existing behavior.

### Preserve public API compatibility

The public `NotionLoaderOptions` names remain available without aliases or deprecations. In particular, `experimentalCacheImageInData` keeps its name but its documentation will state that enabling it also localizes hosted file properties. Internal source modules are not package exports, so the internal downloader rename does not require a compatibility alias.

## Risks / Trade-offs

- Internal consumers may deep-import `src/image.ts` despite the package export map → Treat this as unsupported, mention the internal move in change documentation, and avoid adding permanent compatibility code.
- A broad asset rename could accidentally include public files in `assetImports` → Keep destination-specific tests asserting that only source image paths enter `imagePaths` and that public assets use final public URLs.
- Moving code could silently alter cache paths or error behavior → Move the proven implementation before simplifying it and retain focused tests for successful responses, cache hits, forced downloads, response failures, pending writes, and write failures.
- Removing `rehype-assets.ts` could discard intended future work → Its current behavior has no production caller or specification; future URL rewriting should be proposed against a concrete requirement.
- Existing documentation and specs may remain internally inconsistent → Update the asset, image, page-rendering, README, and compatibility narratives in the same change.

## Migration Plan

1. Establish behavior-preserving tests around generic asset downloading and both renderer destinations.
2. Consolidate the active implementation and path helpers into `asset.ts`, then update internal imports.
3. Remove `image.ts`, `rehype-assets.ts`, and obsolete test-only coverage after their live replacements pass.
4. Update public documentation and base specifications.
5. Run formatting, typecheck, compatibility suites, unit tests, and build in CI order.

Rollback consists of restoring the previous internal module locations and imports. No persisted path format or public option migration is required.

## Open Questions

None. Naming scope, module consolidation, stale plugin removal, and public option compatibility were approved before artifact creation.
