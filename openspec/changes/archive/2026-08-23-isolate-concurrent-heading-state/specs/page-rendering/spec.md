## MODIFIED Requirements

### Requirement: Table of Contents Extraction

The renderer SHALL extract heading information for table of contents generation and SHALL isolate that information to the content being processed by each render invocation.

#### Scenario: Extract headings
- **WHEN** content is processed
- **THEN** headings are extracted using `rehype-toc` plugin
- **AND** each heading includes `depth`, `text`, and `slug`

#### Scenario: Nested headings
- **WHEN** the content has nested headings (h2 inside h1 context)
- **THEN** the depth reflects the nesting level starting from 0

#### Scenario: Isolate headings during overlapping renders
- **WHEN** multiple pages are processed concurrently and a custom rehype plugin performs asynchronous work
- **THEN** each rendered result contains only the headings extracted from its own page
- **AND** no rendered result contains heading metadata from another page
