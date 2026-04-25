# Capability: Formatters

## Purpose

Provide utility functions for transforming Notion API objects (rich text, files, dates) into simple JavaScript types for easier consumption in application code.

## Requirements

### Requirement: Rich Text Formatting

The `richTextToPlainText` function SHALL convert Notion rich text arrays to plain strings.

#### Scenario: Convert rich text to string
- **WHEN** given an array of rich text items
- **THEN** the `plain_text` values are extracted and concatenated

#### Scenario: Empty array
- **WHEN** given an empty array
- **THEN** an empty string is returned

#### Scenario: Multiple text items
- **WHEN** given multiple rich text items
- **THEN** all `plain_text` values are joined without separator

### Requirement: File URL Extraction

The `fileToUrl` function SHALL extract URLs from Notion file objects.

#### Scenario: External file URL
- **WHEN** given a file with `type: 'external'`
- **THEN** `file.external.url` is returned

#### Scenario: Hosted file URL
- **WHEN** given a file with `type: 'file'`
- **THEN** `file.file.url` is returned

#### Scenario: Null file
- **WHEN** given `null`
- **THEN** `undefined` is returned

### Requirement: File to Image Asset

The `fileToImageAsset` function SHALL convert file objects to Astro image assets.

#### Scenario: Convert to image asset
- **WHEN** given a file object
- **THEN** `getImage` is called with the file URL and `inferSize: true`
- **AND** the resulting `GetImageResult` is returned

### Requirement: Date Object Conversion

The `dateToDateObjects` function SHALL convert Notion date strings to JavaScript Date objects.

#### Scenario: Convert date with start only
- **WHEN** given a date with `start` only (no `end`)
- **THEN** `start` is converted to a `Date` object
- **AND** `end` is `null`
- **AND** `time_zone` is preserved

#### Scenario: Convert date with start and end
- **WHEN** given a date with both `start` and `end`
- **THEN** both are converted to `Date` objects

#### Scenario: Null date
- **WHEN** given `null`
- **THEN** `null` is returned

### Requirement: Exports

All formatter functions SHALL be exported from the main package entry point.

#### Scenario: Main exports
- **WHEN** importing from `notion-astro-loader`
- **THEN** `richTextToPlainText`, `fileToUrl`, `fileToImageAsset`, and `dateToDateObjects` are available
