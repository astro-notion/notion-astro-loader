## ADDED Requirements

### Requirement: Astro 6 Zod Compatibility
The schema system SHALL expose validators that remain usable in Astro 6's `astro/zod` environment while preserving the existing parsed data shapes.

#### Scenario: Page schema remains consumable in Astro 6
- **WHEN** a consumer imports `notionPageSchema` or `pageObjectSchema` in an Astro 6 project
- **THEN** the returned schemas are valid `astro/zod` schemas
- **AND** they validate the same page-level fields documented by the existing capability

#### Scenario: Exported property schemas preserve parsed outputs
- **WHEN** a consumer imports raw or transformed property schemas in an Astro 6 project
- **THEN** the schemas remain usable in collection definitions and runtime validation
- **AND** successful parsing produces the same logical output shapes documented before the upgrade

#### Scenario: Dynamic schemas remain valid for URL and date-heavy properties
- **WHEN** `propertiesSchemaForDatabase` builds schemas for properties such as URL, date, created time, or last edited time
- **THEN** the resulting schemas are valid in Astro 6's Zod 4 environment
- **AND** valid Notion responses continue to parse successfully
