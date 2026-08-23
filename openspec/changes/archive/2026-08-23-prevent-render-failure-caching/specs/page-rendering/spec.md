## MODIFIED Requirements

### Requirement: Rendered Output Structure

The renderer SHALL return structured HTML and metadata while retaining image-specific metadata for Astro processing, and SHALL reject when rendering cannot complete.

#### Scenario: Successful render
- **WHEN** rendering completes successfully
- **THEN** the result includes `html` as a string
- **AND** `metadata` contains a `headings` array and an `imagePaths` array
- **AND** `imagePaths` contains only local source images eligible for Astro asset imports during normal loader operation

#### Scenario: Render failure
- **WHEN** rendering fails with an error
- **THEN** an operation-context error message is logged
- **AND** the render promise rejects with the original error
- **AND** no rendered entry is returned
