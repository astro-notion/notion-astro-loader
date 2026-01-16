# Capability: Notion Loader

## Purpose

Provide a fully-featured Astro Content Layer loader that fetches pages from a Notion database, dynamically generates Zod schemas from database properties, renders page content to HTML, and supports incremental loading with caching.

## Requirements

### Requirement: Astro Loader Interface

The `notionLoader` function SHALL return a valid Astro `Loader` object that conforms to the Astro Content Layer API specification.

#### Scenario: Loader creation with minimal config
- **WHEN** `notionLoader` is called with `auth` and `database_id` options
- **THEN** a loader object with `name`, `schema`, and `load` properties is returned
- **AND** the loader name follows the pattern `notion-loader` or `notion-loader/{collectionName}`

#### Scenario: Loader creation with custom collection name
- **WHEN** `notionLoader` is called with a `collectionName` option
- **THEN** the loader name is `notion-loader/{collectionName}`

### Requirement: Notion Client Configuration

The loader SHALL accept all standard Notion SDK client options for authentication and configuration.

#### Scenario: Authentication with API token
- **WHEN** `notionLoader` is called with a valid `auth` token
- **THEN** the loader creates a Notion client that can authenticate with the Notion API

#### Scenario: Custom client options
- **WHEN** `notionLoader` is called with options like `timeoutMs`, `baseUrl`, `notionVersion`, `fetch`, or `agent`
- **THEN** these options are passed to the underlying Notion Client constructor

### Requirement: Database Query Configuration

The loader SHALL accept standard Notion database query parameters for filtering and sorting pages.

#### Scenario: Filter pages by property
- **WHEN** `notionLoader` is configured with a `filter` option
- **THEN** only pages matching the filter criteria are loaded from the database

#### Scenario: Sort pages
- **WHEN** `notionLoader` is configured with a `sorts` option
- **THEN** pages are returned in the specified sort order

#### Scenario: Filter specific properties
- **WHEN** `notionLoader` is configured with `filter_properties`
- **THEN** only the specified properties are included in the response

#### Scenario: Include archived pages
- **WHEN** `notionLoader` is configured with `archived: true`
- **THEN** archived pages are included in the query results

### Requirement: Incremental Loading

The loader SHALL support incremental loading by tracking page modifications and only re-rendering changed pages.

#### Scenario: Skip unchanged pages
- **WHEN** a page exists in the store with the same `last_edited_time` as the API response
- **THEN** the page is skipped and not re-rendered
- **AND** a debug message is logged

#### Scenario: Update changed pages
- **WHEN** a page exists in the store but has a different `last_edited_time` than the API response
- **THEN** the page is re-rendered and updated in the store
- **AND** an info message noting the update is logged

#### Scenario: Create new pages
- **WHEN** a page from the API does not exist in the store
- **THEN** the page is rendered and added to the store
- **AND** an info message noting the creation is logged

#### Scenario: Delete removed pages
- **WHEN** a page exists in the store but is not returned by the API
- **THEN** the page is deleted from the store
- **AND** an info message noting the deletion is logged

### Requirement: Dynamic Schema Generation

The loader SHALL dynamically generate a Zod schema based on the database's property configuration.

#### Scenario: Generate schema from database
- **WHEN** the loader's `schema` method is called
- **THEN** it retrieves the database configuration from Notion
- **AND** generates a Zod schema matching the database property types

#### Scenario: Include property descriptions
- **WHEN** a database property has a description
- **THEN** the generated Zod schema includes the description via `.describe()`

### Requirement: Rehype Plugin Support

The loader SHALL allow custom rehype plugins to be passed for HTML post-processing.

#### Scenario: Apply string-based plugin
- **WHEN** `rehypePlugins` includes a plugin specified as a string
- **THEN** the plugin is dynamically imported and applied to the processor

#### Scenario: Apply function-based plugin
- **WHEN** `rehypePlugins` includes a plugin specified as a function
- **THEN** the plugin function is used directly

#### Scenario: Apply plugin with options
- **WHEN** `rehypePlugins` includes a plugin in `[plugin, options]` array format
- **THEN** the plugin is applied with the specified options

### Requirement: Store Entry Format

The loader SHALL store rendered pages with the correct entry format including content, metadata, and asset references.

#### Scenario: Store entry structure
- **WHEN** a page is stored
- **THEN** the entry includes `id`, `digest`, `data`, `rendered`, `filePath`, and `assetImports`
- **AND** `digest` is set to `last_edited_time` for change detection
- **AND** `assetImports` contains paths to images used in the page

### Requirement: Logging

The loader SHALL provide structured logging with per-page context and forked loggers.

#### Scenario: Database-level logging
- **WHEN** the load process starts
- **THEN** an info message with the count of existing pages is logged

#### Scenario: Page-level logging
- **WHEN** processing a page
- **THEN** a forked logger with the page ID prefix is used
- **AND** page title and last edited date are included in log messages
