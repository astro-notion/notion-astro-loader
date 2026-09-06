## ADDED Requirements

### Requirement: Stable Asset-Cache Option Names

The loader SHALL accept canonical (non-`experimental`) names for the page-data asset-cache options and SHALL continue to accept the legacy `experimental*` names as deprecated aliases for one major.

#### Scenario: Canonical names enable page-data asset caching

- **WHEN** `notionLoader` is configured with the canonical asset-cache option enabled
- **THEN** hosted covers, icons, and file properties are localized exactly as when the legacy `experimentalCacheImageInData` option is enabled

#### Scenario: Canonical root alias applies to transformed image paths

- **WHEN** `notionLoader` is configured with the canonical root-alias option
- **THEN** transformed cover image paths use that alias exactly as when the legacy `experimentalRootSourceAlias` option is set

#### Scenario: New name wins when both names are supplied

- **WHEN** `notionLoader` is configured with both the canonical option and its legacy `experimental*` alias
- **THEN** the canonical option value is used and the alias value is ignored

#### Scenario: Legacy alias still works when the canonical option is absent

- **WHEN** `notionLoader` is configured with only the legacy `experimental*` option
- **THEN** the loader translates it to the corresponding canonical field with identical behavior

#### Scenario: Deprecated alias use is logged

- **WHEN** `notionLoader` is configured with a legacy `experimental*` alias and no corresponding canonical option
- **THEN** the loader emits a deprecation warning naming the alias and its canonical replacement

#### Scenario: Defaults are unchanged

- **WHEN** `notionLoader` is configured with neither the canonical options nor the legacy aliases
- **THEN** page-data asset caching defaults to disabled and the root alias defaults to `src`
