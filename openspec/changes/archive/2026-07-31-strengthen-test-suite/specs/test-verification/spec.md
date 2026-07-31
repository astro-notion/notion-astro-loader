## ADDED Requirements

### Requirement: Service-Independent Runtime Verification

The runtime suite SHALL exercise package behavior without Notion credentials or non-local runtime services.

#### Scenario: Loader lifecycle
- **WHEN** fixtures represent new, changed, unchanged, forced, removed, and partial pages
- **THEN** store entries, deletions, digests, virtual paths, parsed data, and asset imports match the loader contract

#### Scenario: Rendering contract
- **WHEN** a compact fixture page contains recursive and representative asset-bearing blocks
- **THEN** the real rendering pipeline produces the expected semantic HTML, headings, page data, and image metadata
- **AND** hosted PDF blocks use the same downloaded-asset path semantics as other hosted block assets

#### Scenario: Existing compatibility coverage
- **WHEN** the mixed-purpose suite is split
- **THEN** its representative schema, rehype, loader option, and `astro:assets` assertions remain covered

### Requirement: Isolated Test State

Tests SHALL restore filesystem, process, and mock state between scenarios.

#### Scenario: Mutable state cleanup
- **WHEN** a test uses temporary files or changes `FORCE_RERENDER`, the working directory, global `fetch`, or module mocks
- **THEN** created files are removed and original state is restored before another test runs

### Requirement: Diagnostic Coverage Reporting

The project SHALL provide a command that reports runtime test coverage without enforcing an initial percentage threshold.

#### Scenario: Generate coverage report
- **WHEN** a maintainer runs the coverage command
- **THEN** Vitest reports line and branch coverage for package source modules
- **AND** the command does not fail solely because an aggregate percentage is below a configured threshold

### Requirement: Pull Request Continuous Integration

The project SHALL run its documented quality commands for pull requests and default-branch pushes.

#### Scenario: Pull request verification
- **WHEN** a pull request is opened or updated
- **THEN** formatting, type checking, Astro 6/7 compatibility, runtime tests, and package build verification run without Notion credentials

#### Scenario: Quality gate failure
- **WHEN** any required verification command fails
- **THEN** the continuous integration workflow reports the failure

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
- **AND** the normalized output contains no Notion token or signed source URL

#### Scenario: Establish snapshot baseline
- **WHEN** the initial normalized HTML is generated after live credentials are provisioned
- **THEN** a maintainer reviews the complete output for expected structure and sensitive values before committing the snapshot

#### Scenario: Generate local browser preview
- **WHEN** a maintainer invokes the live preview command
- **THEN** browser-readable HTML and downloaded assets are written beneath a gitignored local output directory
- **AND** local asset references resolve relative to the preview HTML
- **AND** no GitHub Actions workflow uploads the preview as an artifact

#### Scenario: Contributor pull request
- **WHEN** a pull request originates from a fork without access to repository secrets
- **THEN** the live golden-page test is not invoked

#### Scenario: Missing live-test configuration
- **WHEN** the dedicated live workflow runs without its required token or data source identifier
- **THEN** it fails with an actionable configuration error that does not expose secret values
