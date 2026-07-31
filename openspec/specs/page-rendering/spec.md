# Capability: Page Rendering

## Purpose

Convert Notion page blocks into HTML content using a unified/rehype pipeline, with support for heading extraction, custom rehype plugins, and image processing integration.
## Requirements
### Requirement: Block Fetching

The renderer SHALL recursively fetch all blocks from a Notion page, including nested children.

#### Scenario: Fetch top-level blocks
- **WHEN** rendering a Notion page
- **THEN** all blocks from the page are fetched via paginated API

#### Scenario: Fetch nested children
- **WHEN** a block has `has_children: true`
- **THEN** the children are recursively fetched
- **AND** attached to the parent block's `children` property

#### Scenario: Skip partial blocks
- **WHEN** a block is not a "full block" (partial response)
- **THEN** the block is skipped

### Requirement: HTML Rendering Pipeline

The renderer SHALL use a unified/rehype pipeline to convert Notion blocks to HTML.

#### Scenario: Base processing chain
- **WHEN** processing Notion blocks
- **THEN** the pipeline applies: `@astro-notion/notion-rehype` → `rehype-slug` → HAST element property normalization → `rehype-katex` → `rehype-stringify`

#### Scenario: List element compatibility
- **WHEN** Notion list HAST omits an element `properties` object
- **THEN** the renderer adds an empty object before KaTeX processing

#### Scenario: Custom plugins applied
- **WHEN** custom rehype plugins are configured
- **THEN** they are applied after the base plugins but before final stringification

### Requirement: Table of Contents Extraction

The renderer SHALL extract heading information for table of contents generation.

#### Scenario: Extract headings
- **WHEN** content is processed
- **THEN** headings are extracted using `rehype-toc` plugin
- **AND** each heading includes `depth`, `text`, and `slug`

#### Scenario: Nested headings
- **WHEN** the content has nested headings (h2 inside h1 context)
- **THEN** the depth reflects the nesting level starting from 0

### Requirement: Rendered Output Structure

The renderer SHALL return structured HTML and metadata while retaining image-specific metadata for Astro processing.

#### Scenario: Successful render
- **WHEN** rendering completes successfully
- **THEN** the result includes `html` as a string
- **AND** `metadata` contains a `headings` array and an `imagePaths` array
- **AND** `imagePaths` contains only local source images eligible for Astro asset imports during normal loader operation

#### Scenario: Render failure
- **WHEN** rendering fails with an error
- **THEN** an operation-context error message is logged
- **AND** `undefined` is returned

### Requirement: Page Data Extraction

The renderer SHALL extract page data for Astro's `parseData` function and optionally localize supported hosted page assets.

#### Scenario: Basic page data
- **WHEN** `getPageData()` is called without asset caching enabled
- **THEN** the result includes `id` and `data` with `icon`, `cover`, `archived`, `in_trash`, `url`, `public_url`, and `properties`
- **AND** hosted page assets retain their original URLs

#### Scenario: Transform cover image experimentally
- **WHEN** page-data asset caching is enabled with a source alias
- **AND** the page has a file-type cover
- **THEN** the cover URL uses the downloaded source path with that alias

#### Scenario: Preserve an external cover
- **WHEN** the cover has `type: 'external'`
- **THEN** its URL remains unchanged

### Requirement: Hosted Asset Block Processing

The renderer SHALL process hosted image, file, PDF, video, and audio blocks through the shared Notion asset downloader while preserving standard Notion asset object shapes and block-specific rendering semantics.

#### Scenario: Process an image block
- **WHEN** a block has `type: 'image'` and contains a Notion `file` asset
- **THEN** the asset is saved under the configured source image destination
- **AND** the block uses the returned local path
- **AND** its caption is preserved

#### Scenario: Process a directly served asset block
- **WHEN** a block has `type: 'file'`, `pdf`, `video`, or `audio` and contains a Notion `file` asset
- **THEN** the asset is saved under the configured public destination
- **AND** the block uses a URL under the configured Astro base and public path

#### Scenario: Process PDF block
- **WHEN** a block has `type: 'pdf'`
- **THEN** it is downloaded and rendered through the file-block handler

#### Scenario: Preserve an external block asset
- **WHEN** a supported asset block contains an `external` asset
- **THEN** the renderer leaves the external URL unchanged
- **AND** does not download the asset

#### Scenario: Non-asset blocks
- **WHEN** a block is not a supported asset type
- **THEN** the block is yielded unchanged except for recursively attached children

### Requirement: Hosted Page Property Assets

The renderer SHALL localize supported hosted page assets when `experimentalCacheImageInData` is enabled while preserving the public option name.

#### Scenario: Cache cover and icon assets
- **WHEN** `experimentalCacheImageInData` is enabled
- **AND** the page has file-type cover or icon assets
- **THEN** those visual assets are saved under the source image destination

#### Scenario: Cache hosted files properties
- **WHEN** `experimentalCacheImageInData` is enabled
- **AND** a page property has type `files` with Notion-hosted assets
- **THEN** those assets are saved under the public destination
- **AND** external file property URLs remain unchanged

### Requirement: Asset Destination Isolation

The renderer SHALL keep directly served public assets out of Astro image import metadata.

#### Scenario: Render mixed hosted assets
- **WHEN** a page contains a hosted image and hosted non-image media
- **THEN** `metadata.imagePaths` contains the source image path
- **AND** does not contain public document or media paths
