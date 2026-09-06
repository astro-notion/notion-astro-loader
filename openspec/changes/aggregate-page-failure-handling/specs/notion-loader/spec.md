## MODIFIED Requirements

### Requirement: Incremental Loading

The loader SHALL support incremental loading by tracking page modifications, only re-rendering changed pages, only committing a page after rendering succeeds, attempting every page and every deletion despite per-page failures, and failing the load with a single aggregated error when any page failed.

#### Scenario: Skip unchanged pages
- **WHEN** a page exists in the store with the same `last_edited_time` as the API response
- **THEN** the page is skipped and not re-rendered
- **AND** a debug message is logged

#### Scenario: Update changed pages
- **WHEN** a page exists in the store but has a different `last_edited_time` than the API response
- **AND** rendering the updated page succeeds
- **THEN** the page is re-rendered and updated in the store
- **AND** an info message noting the update is logged

#### Scenario: Create new pages
- **WHEN** a page from the API does not exist in the store
- **AND** rendering the page succeeds
- **THEN** the page is rendered and added to the store
- **AND** an info message noting the creation is logged

#### Scenario: Attempt every page despite earlier per-page failures
- **WHEN** one page's `getPageData`, `parseData`, or `render` fails
- **THEN** the loader continues pagination and attempts every remaining page from the API response
- **AND** no queued render is left floating unawaited

#### Scenario: Delete removed pages even when some renders failed
- **WHEN** pages exist in the store but are not returned by the API
- **AND** one or more other pages failed to render in the same sync
- **THEN** the absent pages are still deleted from the store
- **AND** an info message noting each deletion is logged

#### Scenario: Preserve an existing entry when rendering its update fails
- **WHEN** a page exists in the store with a different `last_edited_time` than the API response
- **AND** rendering the updated page fails
- **THEN** the existing store entry remains unchanged, including its prior digest, data, rendered content, and asset imports
- **AND** no new digest is written for the page so the unchanged digest allows the page to be retried during the next load
- **AND** the error is logged with page-id context and collected for aggregation rather than aborting the loop

#### Scenario: Avoid creating an entry when its first render fails
- **WHEN** a page from the API does not exist in the store
- **AND** rendering the page fails
- **THEN** no store entry or current digest is written for the page
- **AND** the absent entry allows the page to be retried during the next load
- **AND** the error is logged with page-id context and collected for aggregation rather than aborting the loop

#### Scenario: Throw a single aggregated error after all pages and deletions are attempted
- **WHEN** one or more pages failed during the sync
- **AND** all pages and all deletions have been attempted
- **THEN** the load throws a single aggregated error listing each failed page id and its cause
- **AND** `astro sync` / build still fails loudly with every broken page visible in one run
