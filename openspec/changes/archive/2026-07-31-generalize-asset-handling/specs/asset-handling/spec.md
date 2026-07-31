## ADDED Requirements

### Requirement: Notion Hosted Asset Download
The system SHALL download a Notion-hosted `file` asset without depending on the asset's media type or hostname, and SHALL reject malformed URLs before making a network request.

#### Scenario: Download a hosted asset
- **WHEN** a Notion `file` asset URL contains the required parent, object, and filename path segments
- **THEN** the system downloads the response content to the configured destination
- **AND** returns the saved path relative to the destination's configured base

#### Scenario: Reject a malformed hosted asset URL
- **WHEN** a hosted asset URL is invalid or lacks a required path segment
- **THEN** the system rejects the operation with an invalid URL error
- **AND** does not make a network request or write a file

### Requirement: Hosted Asset Response Validation
The system SHALL validate a hosted asset response before consuming or writing its content.

#### Scenario: Reject an unsuccessful response
- **WHEN** the hosted asset request returns a non-successful HTTP response
- **THEN** the system rejects the operation with HTTP status context
- **AND** does not expose the signed asset URL in the error
- **AND** does not consume the response body or replace cached content

### Requirement: Hosted Asset Cache
The system SHALL reuse an existing hosted asset unless cache use is explicitly disabled.

#### Scenario: Reuse a cached asset
- **WHEN** the destination file already exists
- **AND** cache use is enabled
- **THEN** the system returns the existing path without making a network request

#### Scenario: Refresh a cached asset
- **WHEN** the destination file already exists
- **AND** cache use is disabled
- **THEN** the system downloads and writes the current response content before completing

### Requirement: Stable Hosted Asset Path
The system SHALL preserve the established `{destination}/{parentId}/{objectId}.{extension}` path layout for every hosted asset type.

#### Scenario: Save a non-image asset
- **WHEN** a hosted PDF, video, audio, or document is downloaded
- **THEN** its local path uses the URL parent ID, object ID, and original extension
- **AND** uses the same path layout as a hosted image

### Requirement: Asset Download Diagnostics
The system SHALL report hosted asset downloads and cache hits with asset-neutral terminology after the relevant filesystem operation completes.

#### Scenario: Report a completed download
- **WHEN** the asset content has been written successfully
- **THEN** the download callback and optional log report a completed asset download

#### Scenario: Do not report a failed write
- **WHEN** writing downloaded content fails
- **THEN** the write error is propagated
- **AND** no completed-download log or tag is emitted

### Requirement: Asset Destination Paths
The system SHALL support source-relative paths for Astro asset processing and destination-relative paths for directly served public assets.

#### Scenario: Resolve a source asset path
- **WHEN** an asset path is relative to the virtual content root
- **THEN** the system can resolve it relative to the project's `src` directory

#### Scenario: Return a public asset path
- **WHEN** a public destination is supplied as the relative-path base
- **THEN** the downloader returns a path relative to that public destination

### Requirement: Virtual Content Root
The system SHALL use `src/content/notion` as the virtual content root for Notion entries and source asset path resolution.

#### Scenario: Build a virtual entry path
- **WHEN** the loader stores a rendered Notion entry
- **THEN** its virtual file path is rooted below `src/content/notion`
