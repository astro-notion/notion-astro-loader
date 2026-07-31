## MODIFIED Requirements

### Requirement: Image Block Processing

The renderer SHALL download hosted file, image, video, audio, and PDF block assets and preserve standard Notion asset object shapes for rendering.

#### Scenario: Process supported hosted asset block
- **WHEN** a supported asset block uses a Notion-hosted file
- **THEN** the asset is downloaded through the shared asset callback
- **AND** the block uses the returned local asset path
- **AND** captions and other block data are preserved

#### Scenario: Process PDF block
- **WHEN** a block has `type: 'pdf'`
- **THEN** it is downloaded and rendered through the file-block handler

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
