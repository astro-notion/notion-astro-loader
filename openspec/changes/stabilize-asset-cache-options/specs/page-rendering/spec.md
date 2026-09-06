## MODIFIED Requirements

### Requirement: Hosted Page Property Assets

The renderer SHALL localize supported hosted page assets when page-data asset caching is enabled while preserving the public option name.

#### Scenario: Cache cover and icon assets

- **WHEN** page-data asset caching is enabled
- **AND** the page has file-type cover or icon assets
- **THEN** those visual assets are saved under the source image destination

#### Scenario: Cache hosted files properties

- **WHEN** page-data asset caching is enabled
- **AND** a page property has type `files` with Notion-hosted assets
- **THEN** those assets are saved under the public destination
- **AND** external file property URLs remain unchanged
