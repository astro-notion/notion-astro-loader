## Context

`NotionPageRenderer` deliberately sends hosted images to a source directory so Astro can import and optimize them, while hosted documents and media go to a public directory for direct serving. The live golden-page test currently supplies only the image directory. This activates the renderer's internal fallback for non-image assets and produces source-relative URLs, but those assets are still excluded from image-only metadata. The test then applies the image metadata contract to every hosted asset and fails before snapshot verification.

The live preview also currently copies only assets listed in image metadata. Introducing a real public destination requires the preview to copy and rewrite public assets separately so all local references remain usable.

## Goals / Non-Goals

**Goals:**

- Exercise the same source-image/public-asset split used by the loader and compatibility fixture.
- Assert image metadata only for hosted images.
- Assert downloaded files and rendered public URLs for hosted file, PDF, video, and audio blocks.
- Keep local preview references valid for both destination classes.
- Preserve safe diagnostics, secret rejection, fixture inventory, and snapshot behavior.

**Non-Goals:**

- Change `NotionPageRenderer` runtime behavior or its asset metadata contract.
- Change the package's public API or loader options.
- Move credentialed live verification into pull-request CI.
- Address unrelated snapshot path normalization concerns.

## Decisions

### Model asset expectations by destination

The live test will classify hosted block assets as source images or public assets based on block type. It will resolve expected downloaded paths against the matching temporary root. Source images must appear in `rendered.metadata.imagePaths`; public assets must instead appear in rendered HTML under the configured public URL prefix.

This follows the production contract directly. Expanding `imagePaths` to include documents or media was rejected because Astro treats that metadata as image imports.

### Give the renderer explicit temporary roots

The test will create one temporary working root containing separate image and public directories, then pass both directories and a stable public URL prefix to `NotionPageRenderer`. A shared parent keeps cleanup atomic while preserving destination boundaries.

Using the image directory as an implicit fallback was rejected because it does not exercise production public-path behavior and caused the incorrect assertions.

### Extend preview generation with explicit public mappings

Preview generation will continue deriving source-image mappings from image metadata. It will additionally receive the public root and URL prefix, copy public assets into the preview output under a corresponding relative directory, and rewrite root-relative public URLs to browser-resolvable preview paths.

Scanning the rendered HTML for arbitrary local files was rejected because explicit roots and prefixes provide a safer boundary and clearer failure diagnostics.

### Cover routing without live credentials

Focused tests will verify destination classification, image metadata expectations, public URL expectations, and preview copying with temporary files. The credentialed test remains the end-to-end proof against Notion.

## Risks / Trade-offs

- [Risk] Preview URL rewriting could accidentally alter unrelated text that contains the same prefix. -> Mitigation: rewrite only the configured normalized public URL prefix and test image, link, video, and audio attributes.
- [Risk] Fixture block types could expand without a routing expectation. -> Mitigation: keep classification explicit and fail with block ID and type when a hosted asset has no supported destination.
- [Trade-off] The live harness gains additional setup parameters. -> The explicit configuration mirrors production and removes reliance on renderer fallback behavior.
