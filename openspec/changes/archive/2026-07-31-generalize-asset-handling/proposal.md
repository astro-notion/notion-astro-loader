## Why

The renderer now downloads Notion-hosted documents, PDFs, video, and audio in addition to images, but the shared downloader and specifications still describe image-only AWS behavior. Unused generic modules also duplicate this logic with different path, error, and write semantics, making the intended asset pipeline unclear and unsafe to extend.

## What Changes

- Consolidate Notion-hosted asset download, caching, path generation, logging, and error handling in `src/asset.ts` under asset-oriented names.
- Replace the internal `saveImageFromAWS` concept with a provider-neutral Notion asset operation that supports every hosted file type handled by the renderer.
- Keep image-specific configuration and metadata names where they represent Astro image processing, including `imageSavePath`, `imagePaths`, `rehypeImages`, and `fileToImageAsset`.
- Remove the disconnected `rehype-assets.ts` plugin and its test-only behavior rather than integrating its broader URL rewriting into the live rendering pipeline.
- Preserve existing public loader option names, including `experimentalCacheImageInData`, while documenting that the experimental option also caches hosted file properties.
- Align tests, user documentation, and OpenSpec requirements with the two destination pipelines: image-like assets under `src` for Astro processing and non-image assets under `public` for direct serving.

## Capabilities

### New Capabilities
- `asset-handling`: Downloading, caching, path generation, diagnostics, and destination behavior for Notion-hosted assets independent of media type or storage provider hostname.

### Modified Capabilities
- `image-handling`: Limit image-specific requirements to Astro image processing, image destinations, cover path transformation, and external image passthrough.
- `page-rendering`: Specify how image-like and directly served hosted assets are routed, transformed, reported, and rendered.

## Impact

- Affected implementation: `src/asset.ts`, `src/image.ts`, `src/render.ts`, `src/loader.ts`, and `src/rehype/rehype-assets.ts`.
- Affected tests: downloader, renderer, rehype plugin, compatibility, and live asset coverage.
- Affected documentation: loader options, hosted asset behavior, public asset destinations, and image optimization guidance.
- Public loader option names and rendered image metadata remain compatible; internal deep imports of non-exported source modules are not preserved as supported API.
- No new runtime dependencies are required.
