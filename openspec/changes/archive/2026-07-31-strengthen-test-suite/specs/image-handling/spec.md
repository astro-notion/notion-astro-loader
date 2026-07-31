## ADDED Requirements

### Requirement: Hosted Image HTTP Response Validation

`saveImageFromAWS` SHALL reject non-successful HTTP responses before reading or writing response content.

#### Scenario: Image download receives non-successful response
- **WHEN** `saveImageFromAWS` receives a response whose `ok` value is false
- **THEN** it throws an error containing the download operation and HTTP status
- **AND** the error does not contain the signed source URL
- **AND** no destination image is created or replaced
