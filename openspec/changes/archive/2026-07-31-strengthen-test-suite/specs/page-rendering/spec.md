## MODIFIED Requirements

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
