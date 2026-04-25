## MODIFIED Requirements

### Requirement: File to Image Asset
The `fileToImageAsset` function SHALL convert file objects to Astro image assets when invoked from a server-side Astro context.

#### Scenario: Convert to image asset on server
- **WHEN** given a file object in server-side code
- **THEN** `getImage` is called with the file URL and `inferSize: true`
- **AND** the resulting `GetImageResult` is returned

#### Scenario: Hosted file URL
- **WHEN** the file object has `type: 'file'`
- **THEN** the helper uses `file.file.url` as the source passed to `getImage`

#### Scenario: External file URL
- **WHEN** the file object has `type: 'external'`
- **THEN** the helper uses `file.external.url` as the source passed to `getImage`

#### Scenario: Server-only usage is documented
- **WHEN** a consumer reads the package documentation for `fileToImageAsset`
- **THEN** the helper is identified as server-only under Astro 6
- **AND** the package does not claim client-side support for this helper
