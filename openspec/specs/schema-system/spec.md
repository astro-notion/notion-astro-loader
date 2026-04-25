# Capability: Schema System

## Purpose

Provide comprehensive Zod schemas for validating Notion API responses, supporting both raw property validation and transformation to simplified JavaScript types, with dynamic schema generation from database configurations.

## Requirements

### Requirement: Page Object Schema

The `pageObjectSchema` SHALL validate the core structure of a Notion page response.

#### Scenario: Validate page icon
- **WHEN** a page has an icon
- **THEN** the icon must be a discriminated union of `external`, `file`, or `emoji` types
- **AND** `null` is accepted when no icon exists

#### Scenario: Validate page cover
- **WHEN** a page has a cover
- **THEN** the cover must be a discriminated union of `external` or `file` types
- **AND** `null` is accepted when no cover exists

#### Scenario: Validate page metadata
- **WHEN** validating a page
- **THEN** `archived` and `in_trash` are required boolean fields
- **AND** `url` is a required valid URL string
- **AND** `public_url` is a nullable URL string

#### Scenario: Validate properties
- **WHEN** validating page properties
- **THEN** each property has a `type` (string) and `id` (string)
- **AND** additional properties are allowed via `passthrough()`

### Requirement: Custom Page Schema

The `notionPageSchema` function SHALL allow customizing the properties schema.

#### Scenario: Extend with custom properties
- **WHEN** `notionPageSchema({ properties: customSchema })` is called
- **THEN** the returned schema uses `customSchema` for the `properties` field
- **AND** all other `pageObjectSchema` fields remain unchanged

### Requirement: Raw Property Schemas

Raw property schemas SHALL validate Notion API property response objects without transformation.

#### Scenario: Validate title property
- **WHEN** a property has `type: 'title'`
- **THEN** the schema validates `title` array of rich text items

#### Scenario: Validate rich_text property
- **WHEN** a property has `type: 'rich_text'`
- **THEN** the schema validates `rich_text` array of rich text items

#### Scenario: Validate number property
- **WHEN** a property has `type: 'number'`
- **THEN** the schema validates `number` as nullable number

#### Scenario: Validate select property
- **WHEN** a property has `type: 'select'`
- **THEN** the schema validates `select` as an object with `id`, `name`, and `color`

#### Scenario: Validate multi_select property
- **WHEN** a property has `type: 'multi_select'`
- **THEN** the schema validates `multi_select` as an array of option objects

#### Scenario: Validate status property
- **WHEN** a property has `type: 'status'`
- **THEN** the schema validates `status` with `id`, `name`, and `color`

#### Scenario: Validate date property
- **WHEN** a property has `type: 'date'`
- **THEN** the schema validates `date` with `start` (string), `end` (nullable string), and `time_zone` (nullable string)

#### Scenario: Validate checkbox property
- **WHEN** a property has `type: 'checkbox'`
- **THEN** the schema validates `checkbox` as a boolean

#### Scenario: Validate url property
- **WHEN** a property has `type: 'url'`
- **THEN** the schema validates `url` as a nullable string

#### Scenario: Validate email property
- **WHEN** a property has `type: 'email'`
- **THEN** the schema validates `email` as a nullable string

#### Scenario: Validate phone_number property
- **WHEN** a property has `type: 'phone_number'`
- **THEN** the schema validates `phone_number` as a nullable string

#### Scenario: Validate created_time property
- **WHEN** a property has `type: 'created_time'`
- **THEN** the schema validates `created_time` as a datetime string

#### Scenario: Validate files property
- **WHEN** a property has `type: 'files'`
- **THEN** the schema validates `files` as an array of file objects

#### Scenario: Validate relation property
- **WHEN** a property has `type: 'relation'`
- **THEN** the schema validates `relation` as an array of objects with `id`

#### Scenario: Validate formula property
- **WHEN** a property has `type: 'formula'`
- **THEN** the schema validates `formula` with a `type` field and passthrough for other fields

### Requirement: Transformed Property Schemas

Transformed property schemas SHALL convert raw properties to simplified JavaScript types.

#### Scenario: Transform title to string
- **WHEN** using `transformedPropertySchema.title`
- **THEN** the rich text array is converted to a plain string

#### Scenario: Transform rich_text to string
- **WHEN** using `transformedPropertySchema.rich_text`
- **THEN** the rich text array is converted to a plain string

#### Scenario: Transform number to number
- **WHEN** using `transformedPropertySchema.number`
- **THEN** the property value is extracted as `property.number`

#### Scenario: Transform url to string
- **WHEN** using `transformedPropertySchema.url`
- **THEN** the property value is extracted as `property.url`

#### Scenario: Transform email to string
- **WHEN** using `transformedPropertySchema.email`
- **THEN** the property value is extracted as `property.email`

#### Scenario: Transform phone_number to string
- **WHEN** using `transformedPropertySchema.phone_number`
- **THEN** the property value is extracted as `property.phone_number`

#### Scenario: Transform checkbox to boolean
- **WHEN** using `transformedPropertySchema.checkbox`
- **THEN** the property value is extracted as `property.checkbox`

#### Scenario: Transform select to string
- **WHEN** using `transformedPropertySchema.select`
- **THEN** the property value is extracted as `property.select?.name ?? null`

#### Scenario: Transform multi_select to string array
- **WHEN** using `transformedPropertySchema.multi_select`
- **THEN** the property value is transformed to an array of option names

#### Scenario: Transform status to string
- **WHEN** using `transformedPropertySchema.status`
- **THEN** the property value is extracted as `property.status?.name ?? null`

#### Scenario: Transform date to Date objects
- **WHEN** using `transformedPropertySchema.date`
- **THEN** the date strings are converted to JavaScript `Date` objects

#### Scenario: Transform created_time to Date
- **WHEN** using `transformedPropertySchema.created_time`
- **THEN** the datetime string is converted to a JavaScript `Date` object

### Requirement: Dynamic Schema Generation

The `propertiesSchemaForDatabase` function SHALL generate schemas based on database configuration.

#### Scenario: Generate from database properties
- **WHEN** called with a Notion client and database ID
- **THEN** the database properties are retrieved via API
- **AND** a Zod object schema is generated with matching property types

#### Scenario: Include property descriptions
- **WHEN** a property has a `description` field
- **THEN** the generated schema includes the description via `.describe()`

### Requirement: File Schema

File schemas SHALL validate Notion file objects for external and hosted files.

#### Scenario: External file type
- **WHEN** a file has `type: 'external'`
- **THEN** the schema validates `external.url` as a string

#### Scenario: Hosted file type
- **WHEN** a file has `type: 'file'`
- **THEN** the schema validates `file.url` as a string

### Requirement: Schema Exports

Schemas SHALL be exported via multiple package entry points.

#### Scenario: Main schemas export
- **WHEN** importing from `notion-astro-loader/schemas`
- **THEN** `pageObjectSchema`, `notionPageSchema`, `propertySchema`, and `transformedPropertySchema` are available

#### Scenario: Raw properties export
- **WHEN** importing from `notion-astro-loader/schemas/raw-properties`
- **THEN** all raw property schemas are available

#### Scenario: Transformed properties export
- **WHEN** importing from `notion-astro-loader/schemas/transformed-properties`
- **THEN** all transformed property schemas are available

#### Scenario: Page schemas export
- **WHEN** importing from `notion-astro-loader/schemas/page`
- **THEN** `pageObjectSchema` and `notionPageSchema` are available
