## MODIFIED Requirements

### Requirement: Isolated Live Notion Golden-Page Verification

The project SHALL compare a normalized rendering of the dedicated live Notion page with a reviewed canonical snapshot, isolated from pull-request verification.

#### Scenario: Select dedicated fixture page

- **WHEN** the live test queries the configured data source
- **THEN** it selects the page whose `Title` property equals `Renderer Test`
- **AND** it verifies the page contains marker `astro-notion-loader-smoke`

#### Scenario: Scheduled golden-page run

- **WHEN** the weekly schedule or manual workflow trigger runs with configured test secrets
- **THEN** the package renders the complete fixture page and downloads its hosted image, file, video, and audio assets
- **AND** the normalized HTML matches the reviewed canonical snapshot

#### Scenario: Normalize volatile output

- **WHEN** live HTML is prepared for snapshot comparison
- **THEN** known signed URLs, temporary roots, timestamps, and platform-specific path separators are replaced with stable placeholders
- **AND** overlapping absolute and relative representations of a temporary root produce the same placeholder regardless of their input order or workspace depth
- **AND** no parent-directory segments remain adjacent to a normalized temporary-root placeholder
- **AND** the normalized output contains no Notion token or signed source URL
