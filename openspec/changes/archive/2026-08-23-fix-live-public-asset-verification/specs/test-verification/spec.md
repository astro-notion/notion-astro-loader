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
- **AND** hosted images are saved to the source-image destination and represented in Astro image metadata
- **AND** hosted files, PDFs, video, and audio are saved to the public destination and represented by public URLs rather than image metadata
- **AND** the normalized HTML matches the reviewed canonical snapshot

#### Scenario: Normalize volatile output

- **WHEN** live HTML is prepared for snapshot comparison
- **THEN** known signed URLs, temporary roots, timestamps, and platform-specific path separators are replaced with stable placeholders
- **AND** the normalized output contains no Notion token or signed source URL

#### Scenario: Establish snapshot baseline

- **WHEN** the initial normalized HTML is generated after live credentials are provisioned
- **THEN** a maintainer reviews the complete output for expected structure and sensitive values before committing the snapshot

#### Scenario: Generate local browser preview

- **WHEN** a maintainer invokes the live preview command
- **THEN** browser-readable HTML and downloaded source images and public assets are written beneath a gitignored local output directory
- **AND** local image, document, video, and audio references resolve relative to the preview HTML
- **AND** no GitHub Actions workflow uploads the preview as an artifact

#### Scenario: Contributor pull request

- **WHEN** a pull request originates from a fork without access to repository secrets
- **THEN** the live golden-page test is not invoked

#### Scenario: Missing live-test configuration

- **WHEN** the dedicated live workflow runs without its required token or data source identifier
- **THEN** it fails with an actionable configuration error that does not expose secret values
