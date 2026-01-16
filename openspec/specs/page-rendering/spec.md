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

### Requirement: Image Block Processing

The renderer SHALL handle image blocks by downloading remote images and returning local paths.

#### Scenario: Process image block
- **WHEN** a block has `type: 'image'`
- **THEN** the image is fetched via the `fetchImage` callback
- **AND** the block is transformed to use the local image path
- **AND** the original caption is preserved

#### Scenario: Non-image blocks
- **WHEN** a block has a type other than `'image'`
- **THEN** the block is yielded unchanged

### Requirement: HTML Rendering Pipeline

The renderer SHALL use a unified/rehype pipeline to convert Notion blocks to HTML.

#### Scenario: Base processing chain
- **WHEN** processing Notion blocks
- **THEN** the pipeline applies: `notion-rehype-k` → `rehype-slug` → `rehype-katex` → `rehype-stringify`

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

The renderer SHALL return a structured output with HTML and metadata.

#### Scenario: Successful render
- **WHEN** rendering completes successfully
- **THEN** the result includes `html` (string) and `metadata` object
- **AND** `metadata` contains `headings` (array) and `imagePaths` (array)

#### Scenario: Render failure
- **WHEN** rendering fails with an error
- **THEN** an error message is logged
- **AND** `undefined` is returned

### Requirement: Page Data Extraction

The renderer SHALL extract page data for Astro's `parseData` function.

#### Scenario: Basic page data
- **WHEN** `getPageData()` is called
- **THEN** the result includes `id` and `data` with `icon`, `cover`, `archived`, `in_trash`, `url`, `public_url`, and `properties`

#### Scenario: Transform cover image (experimental)
- **WHEN** `getPageData(true, 'src')` is called
- **AND** the page has a file-type cover
- **THEN** the cover URL is transformed to use the local cached path with the specified root alias

#### Scenario: External cover unchanged
- **WHEN** the cover is of type `'external'`
- **THEN** the cover URL is not transformed

### Requirement: Image Analytics

The renderer SHALL track image download statistics for logging purposes.

#### Scenario: Track downloaded images
- **WHEN** an image is downloaded
- **THEN** the download counter is incremented

#### Scenario: Track cached images
- **WHEN** an image is already cached
- **THEN** the cached counter is incremented

#### Scenario: Log image statistics
- **WHEN** rendering completes with images processed
- **THEN** an info message with download and cache counts is logged
