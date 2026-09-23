## MODIFIED Requirements

### Requirement: Hosted Page Property Assets

The renderer SHALL localize supported hosted page assets when `cacheImageInData` is enabled.

#### Scenario: Cache cover and icon assets

- **WHEN** `cacheImageInData` is enabled
- **AND** the page has file-type cover or icon assets
- **THEN** those visual assets are saved under the source image destination

#### Scenario: Cache hosted files properties

- **WHEN** `cacheImageInData` is enabled
- **AND** a page property has type `files` with Notion-hosted assets
- **THEN** those assets are saved under the public destination
- **AND** external file property URLs remain unchanged
