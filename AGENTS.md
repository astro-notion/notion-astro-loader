# Astro Content Layer Loader for Notion

A TypeScript package that loads Notion data sources into Astro Content Layer collections and renders pages with Astro-compatible asset metadata.

## Stack

- TypeScript with strict Astro configuration and NodeNext ESM.
- Astro Content Layer API, Astro assets, and Astro's Zod integration.
- Notion SDK `dataSources` API.
- Unified and rehype for rendering Notion pages.
- Vitest for tests and Prettier for formatting.
- Node.js 22.12.0 or newer and pnpm 10.

## Key Commands

- `pnpm build`: compile the package with TypeScript.
- `pnpm build:watch`: compile in watch mode.
- `pnpm clean`: remove generated build output.
- `pnpm exec prettier --check "src/**/*.{ts,js,json}"`: check source formatting.
- `pnpm typecheck`: check `src/` and the compile-only Astro collection fixture in `tests/typecheck/`.
- `pnpm test`: run the Vitest suite.
- `pnpm exec vitest run tests/astro-v6-support.test.ts`: run the compatibility suite alone.
- Match CI locally in this order: formatting, typecheck, tests, then build.

## File Structure

```text
src/
|-- index.ts                    Public exports
|-- loader.ts                   Content Layer schema, pagination, caching, and store writes
|-- render.ts                   Notion block rendering and asset metadata
|-- asset.ts                    Astro asset conversion
|-- image.ts                    Image download and path handling
|-- datasource-properties.ts    Dynamic data-source schema generation
|-- format.ts                   Notion value transformations
|-- types.ts                    Shared internal types
|-- utils.ts                    Shared utilities
|-- schemas/                    Runtime schemas and schema exports
`-- rehype/                     Rendering plugins for assets and images
tests/
|-- astro-v6-support.test.ts    Astro compatibility coverage
`-- typecheck/                  Compile-only Astro collection fixture
docs/
`-- CONTRIBUTING.md             Contributor and maintainer release process
```

## Code Style

- Follow `.prettierrc.cjs`: 120-column width, semicolons, single quotes, two spaces, and ES5 trailing commas.
- Use `import type` for type-only imports.
- Include `.js` extensions on local TypeScript imports because the package compiles as NodeNext ESM.
- Use the `node:` prefix for Node.js built-ins.
- Prefer straightforward control flow, early returns, and descriptive intermediate variables over dense expressions.
- Keep modules focused and avoid new abstractions or dependencies unless they reduce concrete complexity.
- Use runtime schemas at external boundaries and keep them aligned with their TypeScript types.
- Treat Notion API responses as external data and use SDK type guards where applicable.

## Naming Conventions

- Files and directories use kebab-case.
- Variables and functions use camelCase.
- Types, interfaces, classes, and schemas representing named types use PascalCase.
- Module-level constants use UPPER_SNAKE_CASE.
- Private class fields use `#camelCase`.
- Public names should describe the Notion or Astro concept they represent; avoid generic names without domain context.

## Documentation

- Begin source files with a concise file-level doc comment describing their responsibility.
- Add JSDoc or TSDoc to functions and to type, interface, and enum declarations.
- Omit `@param` and `@returns` when the TypeScript signature already makes the contract clear.
- Use `@throws` only for custom or business-logic exceptions that are part of the contract.
- Add `@example` only when correct usage is not obvious.
- Explain why a non-obvious constraint exists; do not restate self-explanatory code.
- Keep TODO and FIXME comments actionable and specific.

## Implementation Notes

- `src/loader.ts` owns Astro Content Layer schema creation, Notion data-source pagination, digest caching, and store writes. `src/render.ts` fetches page blocks and produces HTML plus asset metadata.
- Query the Notion `dataSources` API, not the deprecated database query API.
- Notion-hosted `file` assets are downloaded beneath `<cwd>/src/<imageSavePath>`. Keep `imageSavePath` relative to `src`; moving these files to `public/` bypasses Astro's asset pipeline. External image URLs remain remote.
- Store entries intentionally use virtual paths under `src/content/notion/` and pass rendered image paths through `assetImports`. Preserve both pieces when changing rendering or image handling.
- Set `FORCE_RERENDER` to bypass the `last_edited_time` digest cache while debugging loader output.
- `fileToImageAsset` calls `astro:assets` and is server-only. Do not make it reachable from hydrated or browser-only code.
- The deprecated public `archived` option is translated to the SDK's `in_trash`; explicit `in_trash` wins. Keep this behavior covered by the compatibility suite.

## Quality Checklist

- Formatting, typecheck, tests, and build pass in CI order.
- New behavior and regressions have focused Vitest coverage, including error paths and edge cases where relevant.
- Local imports use `.js` extensions and type-only imports use `import type`.
- Names follow the repository conventions and public APIs have appropriate documentation.
- Error messages include operation context without exposing secrets.
- New public types and schemas are exported from the appropriate module.
- Runtime schema changes remain aligned with TypeScript types.
- Loader changes preserve virtual content paths, `assetImports`, cache behavior, and compatibility semantics.

## Releases

- Contributors do not change package versions or create release tags.
- For an explicit maintainer release task, follow `docs/CONTRIBUTING.md`; it is the canonical versioning, publishing, verification, and recovery procedure.
