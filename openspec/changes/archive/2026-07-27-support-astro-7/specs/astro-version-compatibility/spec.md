## ADDED Requirements

### Requirement: Supported Astro peer versions
The package SHALL declare Astro 6 and Astro 7 as supported peer dependency versions without requiring consumers of either major to bypass peer dependency validation.

#### Scenario: Install with Astro 6
- **WHEN** a consumer installs the package with a supported Astro 6 release
- **THEN** the package manager accepts the declared Astro peer dependency range

#### Scenario: Install with Astro 7
- **WHEN** a consumer installs the package with a supported Astro 7 release
- **THEN** the package manager accepts the declared Astro peer dependency range

### Requirement: Content Loader API compatibility
The package SHALL preserve its public loader configuration, schema generation, store writes, digest caching, and deprecated `archived` option translation under both supported Astro majors.

#### Scenario: Load Notion content with either supported major
- **WHEN** `notionLoader` executes with Astro 6 or Astro 7
- **THEN** it exposes the same loader contract and preserves the existing Notion-to-Astro content semantics

### Requirement: Schema and asset compatibility
The package SHALL keep its exported `astro/zod` schemas, Content Layer fixture, and server-side `astro:assets` conversion compatible with both supported Astro majors.

#### Scenario: Compile a consumer collection
- **WHEN** a representative Astro content collection imports the loader and its exported schemas under Astro 6 or Astro 7
- **THEN** the collection passes TypeScript compilation without version-specific consumer code

#### Scenario: Convert Notion image assets
- **WHEN** hosted or external Notion image metadata is converted under Astro 6 or Astro 7
- **THEN** the package passes the existing image request semantics to `astro:assets` and returns Astro-compatible asset metadata

### Requirement: Dual-major regression verification
The project SHALL provide repeatable verification that exercises the compatibility contract against Astro 6 and Astro 7 before release.

#### Scenario: Verify a compatibility change
- **WHEN** maintainers run the documented compatibility verification for a release candidate
- **THEN** formatting, type checking, focused compatibility tests, the complete test suite, and the package build pass for the supported Astro versions as applicable

### Requirement: Supported version documentation
The package SHALL document that Astro 6 and Astro 7 are supported and identify any version-specific limitations discovered during compatibility validation.

#### Scenario: Consumer evaluates compatibility
- **WHEN** a consumer reads the package documentation or package metadata
- **THEN** the supported Astro major versions and known limitations are clear
