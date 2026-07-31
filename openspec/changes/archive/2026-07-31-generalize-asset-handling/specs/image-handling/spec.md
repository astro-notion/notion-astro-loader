## MODIFIED Requirements

### Requirement: Cover Image Path Transformation
The system SHALL convert a downloaded cover path from the virtual content root to a path relative to the project's `src` directory before applying the configured source alias.

#### Scenario: Transform a hosted cover path
- **WHEN** page-data asset caching is enabled for a file-type cover
- **THEN** the downloaded cover path is resolved from the virtual content root
- **AND** returned relative to `src` with the configured source alias

### Requirement: External Image Passthrough
The renderer SHALL pass through external image, cover, and icon URLs without downloading them.

#### Scenario: External image URL
- **WHEN** an image-like asset has `type: 'external'`
- **THEN** the external URL is returned unchanged
- **AND** no local asset path is recorded

#### Scenario: Hosted image URL
- **WHEN** an image-like asset has `type: 'file'`
- **THEN** the asset is downloaded to the configured source image destination
- **AND** its local path is eligible for Astro image processing

### Requirement: Rehype Image Plugin
The `rehypeImages` plugin SHALL transform only matching rendered image elements for Astro's asset import system.

#### Scenario: Mark image for Astro processing
- **WHEN** an `img` element's decoded `src` is in the `imagePaths` list
- **THEN** the element is transformed to use the `__ASTRO_IMAGE_` attribute
- **AND** the original properties are encoded in that attribute and removed from the element

#### Scenario: Ignore non-image elements
- **WHEN** an element is not an `img` element
- **THEN** the plugin does not mark it for Astro image processing

#### Scenario: Handle duplicate images
- **WHEN** the same image appears multiple times in the content
- **THEN** each occurrence receives a distinct index in its `__ASTRO_IMAGE_` metadata

#### Scenario: Attach local image paths
- **WHEN** Astro file metadata is available during processing
- **THEN** the plugin attaches `imagePaths` as `file.data.astro.localImagePaths`

## REMOVED Requirements

### Requirement: AWS Image Download
**Reason**: Hosted download behavior applies to all Notion file assets and is no longer coupled to AWS or images.
**Migration**: Use the `Notion Hosted Asset Download` requirement in the new `asset-handling` capability.

### Requirement: Image Caching
**Reason**: Cache behavior is shared by every downloaded Notion-hosted asset.
**Migration**: Use the `Hosted Asset Cache` requirement in the new `asset-handling` capability.

### Requirement: Directory Structure
**Reason**: The path layout is shared by image and non-image assets.
**Migration**: Use the `Stable Hosted Asset Path` requirement in the new `asset-handling` capability.

### Requirement: Path Output
**Reason**: Relative output paths vary by source and public asset destinations rather than image type.
**Migration**: Use the `Asset Destination Paths` requirement in the new `asset-handling` capability.

### Requirement: Logging and Tagging
**Reason**: Download and cache diagnostics report every hosted asset type.
**Migration**: Use the `Asset Download Diagnostics` requirement in the new `asset-handling` capability.

### Requirement: Virtual Content Root
**Reason**: The virtual root belongs to shared entry and asset path handling.
**Migration**: Use the `Virtual Content Root` requirement in the new `asset-handling` capability.
