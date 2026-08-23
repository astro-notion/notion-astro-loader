## MODIFIED Requirements

### Requirement: Incremental Loading

The loader SHALL support incremental loading by tracking page modifications, only re-rendering changed pages, and only committing a page after rendering succeeds.

#### Scenario: Skip unchanged pages
- **WHEN** a page exists in the store with the same `last_edited_time` as the API response
- **THEN** the page is skipped and not re-rendered
- **AND** a debug message is logged

#### Scenario: Update changed pages
- **WHEN** a page exists in the store but has a different `last_edited_time` than the API response
- **THEN** the page is re-rendered and updated in the store
- **AND** an info message noting the update is logged

#### Scenario: Create new pages
- **WHEN** a page from the API does not exist in the store
- **THEN** the page is rendered and added to the store
- **AND** an info message noting the creation is logged

#### Scenario: Delete removed pages
- **WHEN** a page exists in the store but is not returned by the API
- **THEN** the page is deleted from the store
- **AND** an info message noting the deletion is logged

#### Scenario: Preserve an existing entry when rendering its update fails
- **WHEN** a page exists in the store with a different `last_edited_time` than the API response
- **AND** rendering the updated page fails
- **THEN** the load rejects with the rendering error
- **AND** the existing store entry remains unchanged, including its prior digest, data, rendered content, and asset imports
- **AND** the unchanged digest allows the page to be retried during the next load

#### Scenario: Avoid creating an entry when its first render fails
- **WHEN** a page from the API does not exist in the store
- **AND** rendering the page fails
- **THEN** the load rejects with the rendering error
- **AND** no store entry or current digest is written for the page
- **AND** the absent entry allows the page to be retried during the next load
