# Capability: Image Handling

## Purpose

Download and cache Notion-hosted images from AWS S3 to the local filesystem, transform image paths for Astro's asset processing pipeline, and provide a rehype plugin for image element transformation.

## Requirements

### Requirement: AWS Image Download

The `saveImageFromAWS` function SHALL download images from Notion's AWS S3 URLs and save them locally.

#### Scenario: Parse AWS URL
- **WHEN** given a valid Notion AWS S3 URL
- **THEN** the URL is parsed into `parentId`, `objId`, and `fileName`
- **AND** these components are used to construct the local save path

#### Scenario: Invalid URL handling
- **WHEN** given a URL without required path components (parentId, objId, fileName)
- **THEN** an error is thrown with message "Invalid URL"

#### Scenario: Directory validation
- **WHEN** the specified `dir` does not exist
- **THEN** an error is thrown indicating the directory doesn't exist

### Requirement: Image Caching

The function SHALL cache images to avoid redundant downloads.

#### Scenario: Download new image
- **WHEN** the image file does not exist locally
- **THEN** the image is downloaded and saved to `{dir}/{parentId}/{objId}.{ext}`

#### Scenario: Skip cached image
- **WHEN** the image file already exists locally
- **AND** `ignoreCache` is not set to `true`
- **THEN** the download is skipped
- **AND** the existing file path is returned

#### Scenario: Force re-download
- **WHEN** `ignoreCache: true` is specified
- **THEN** the image is downloaded regardless of cache state

### Requirement: Directory Structure

The function SHALL organize images in a consistent directory structure.

#### Scenario: Create parent directory
- **WHEN** the parent ID directory doesn't exist
- **THEN** the directory `{dir}/{parentId}/` is created with `ensureDirSync`

#### Scenario: File naming convention
- **WHEN** saving an image
- **THEN** the filename is `{objId}.{ext}` where `ext` is extracted from the original filename

### Requirement: Path Output

The function SHALL return paths relative to the virtual content root.

#### Scenario: Return relative path
- **WHEN** an image is saved
- **THEN** the return value is the path relative to `src/content/notion`

### Requirement: Logging and Tagging

The function SHALL support optional logging and analytics callbacks.

#### Scenario: Log download
- **WHEN** an image is downloaded
- **AND** a `log` callback is provided
- **THEN** the callback is invoked with a message about the saved image

#### Scenario: Log cache hit
- **WHEN** an image is skipped due to cache
- **AND** a `log` callback is provided
- **THEN** the callback is invoked with a message about the cached image

#### Scenario: Tag operation type
- **WHEN** a `tag` callback is provided
- **THEN** the callback is invoked with `'download'` or `'cached'` as appropriate

### Requirement: Cover Image Path Transformation

The `transformImagePathForCover` function SHALL convert raw image paths to `src`-relative paths.

#### Scenario: Transform path
- **WHEN** given a raw path relative to `VIRTUAL_CONTENT_ROOT`
- **THEN** the path is resolved to absolute
- **AND** returned as relative to the `src` directory

### Requirement: External Image Passthrough

The renderer SHALL pass through external image URLs without processing.

#### Scenario: External image URL
- **WHEN** an image has `type: 'external'`
- **THEN** the external URL is returned as-is without downloading

#### Scenario: File image URL
- **WHEN** an image has `type: 'file'`
- **THEN** the file is downloaded and cached locally

### Requirement: Rehype Image Plugin

The `rehypeImages` plugin SHALL transform image elements to use Astro's asset import system.

#### Scenario: Mark image for Astro processing
- **WHEN** an image `src` is in the `imagePaths` list
- **THEN** the element is transformed to use `__ASTRO_IMAGE_` attribute
- **AND** original properties are removed

#### Scenario: Handle duplicate images
- **WHEN** the same image appears multiple times in the content
- **THEN** each occurrence is tracked with an `index` value
- **AND** the index is included in the `__ASTRO_IMAGE_` JSON

#### Scenario: Decode image URLs
- **WHEN** processing an image element
- **THEN** the `src` is decoded using `decodeURI`

#### Scenario: Attach image paths to file
- **WHEN** processing completes
- **THEN** `imagePaths` is attached to `file.data.astro.imagePaths`

### Requirement: Virtual Content Root

A constant `VIRTUAL_CONTENT_ROOT` SHALL be defined for consistent path resolution.

#### Scenario: Constant value
- **WHEN** using `VIRTUAL_CONTENT_ROOT`
- **THEN** the value is `'src/content/notion'`
