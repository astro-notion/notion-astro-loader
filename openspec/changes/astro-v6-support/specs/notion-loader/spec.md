## ADDED Requirements

### Requirement: Runtime Compatibility
The package SHALL declare and verify the runtime versions required to use the loader with Astro 6.

#### Scenario: Package metadata advertises Astro 6 support
- **WHEN** a consumer inspects the published package metadata
- **THEN** the Astro peer dependency range is `>=6 <7`
- **AND** the Node engine constraint targets Astro 6's minimum supported Node.js version

#### Scenario: CI validates supported runtime
- **WHEN** the package CI workflow runs compatibility checks for the upgraded release line
- **THEN** build and type-check steps execute on an Astro 6-compatible Node.js version

#### Scenario: Notion SDK baseline is refreshed
- **WHEN** a consumer installs the upgraded Astro 6 release line
- **THEN** the package ships with an updated `@notionhq/client` dependency baseline appropriate for the new major release

## MODIFIED Requirements

### Requirement: Astro Loader Interface
The `notionLoader` function SHALL return a valid Astro `Loader` object that conforms to the Astro 6 Content Layer API specification.

#### Scenario: Loader creation with minimal config
- **WHEN** `notionLoader` is called with `auth` and `database_id` options
- **THEN** a loader object with `name`, `createSchema`, and `load` properties is returned
- **AND** the loader name follows the pattern `notion-loader` or `notion-loader/{collectionName}`

#### Scenario: Loader creation with custom collection name
- **WHEN** `notionLoader` is called with a `collectionName` option
- **THEN** the loader name is `notion-loader/{collectionName}`

#### Scenario: Loader works in Astro 6 collection definitions
- **WHEN** the returned loader is used in an Astro 6 content collection definition
- **THEN** Astro accepts the loader without relying on legacy content collection compatibility behavior

### Requirement: Dynamic Schema Generation
The loader SHALL dynamically generate a Zod schema based on the database's property configuration using Astro 6's schema creation contract.

#### Scenario: Generate schema from database
- **WHEN** the loader's `createSchema` method is called
- **THEN** it retrieves the database configuration from Notion
- **AND** generates a Zod schema matching the database property types

#### Scenario: Include property descriptions
- **WHEN** a database property has a description
- **THEN** the generated Zod schema includes the description via `.describe()`

#### Scenario: Preserve schema inference inputs
- **WHEN** Astro 6 consumes the schema returned by `createSchema`
- **THEN** the schema preserves the same property names and parsed value shapes as the pre-upgrade loader contract
