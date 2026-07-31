## 1. Lock Asset Behavior

- [x] 1.1 Replace the image-only downloader test surface with asset-oriented coverage that preserves successful download, cache hit, forced refresh, malformed URL, HTTP failure, awaited write, and write-failure behavior, and include a non-image asset path case.
- [x] 1.2 Extend renderer tests to prove source images enter `metadata.imagePaths`, public documents and media do not, public URLs include the configured Astro base path, and external assets remain untouched.

## 2. Consolidate Asset Storage

- [x] 2.1 Replace the unused `src/asset.ts` implementation with the proven Notion-hosted asset downloader, asset-neutral options and diagnostics, the virtual content root, and source-relative path resolution while preserving filesystem layout and errors.
- [x] 2.2 Update `NotionPageRenderer` to use the consolidated asset operation and an explicit source-versus-public destination policy without changing rendered block semantics.
- [x] 2.3 Update the loader to import shared path constants from `asset.ts`, retain public option names, and clarify that experimental page-data caching also handles hosted file properties.

## 3. Remove Superseded Modules

- [x] 3.1 Remove `src/image.ts` after all downloader and path-resolution callers and tests use `asset.ts`, with no compatibility alias for unsupported deep imports.
- [x] 3.2 Remove the unused `rehype-assets.ts` plugin and its test-only behavior while retaining focused `rehypeImages` coverage for Astro image metadata.

## 4. Document Pipeline Boundaries

- [x] 4.1 Update README loader options and asset guidance to describe source image storage, `publicPath` for documents and media, external URL passthrough, and the broader behavior of `experimentalCacheImageInData`.
- [x] 4.2 Update repository implementation guidance so future changes preserve virtual entry paths, source `assetImports`, public asset URLs, and the distinction between generic downloading and image optimization.

## 5. Verify Compatibility

- [x] 5.1 Run `pnpm exec prettier --check "src/**/*.{ts,js,json}"`, `pnpm typecheck`, `pnpm test:compat`, `pnpm test`, and `pnpm build` in CI order and resolve any asset path, public URL, type, or formatting regressions.
