## 1. Live Asset Contract

- [x] 1.1 Add service-independent tests for routing hosted images to source metadata and hosted documents and media to public paths and URLs.
- [x] 1.2 Configure the live golden-page renderer with separate temporary source-image and public-asset directories plus a stable public URL prefix.
- [x] 1.3 Update live assertions to validate downloaded paths, rendered references, and metadata according to each asset destination.

## 2. Browser Preview

- [x] 2.1 Add regression tests proving the preview copies and rewrites both source images and public assets without allowing paths outside their configured roots.
- [x] 2.2 Extend preview generation and its command entry point to accept explicit public asset mappings while preserving browser-resolvable local URLs.

## 3. Verification

- [x] 3.1 Run formatting, type checking, runtime tests, and the package build.
- [x] 3.2 Run the credentialed live test or manually dispatch the Live Notion Verification workflow with repository secrets, then confirm all hosted asset classes pass without changing runtime renderer behavior.
