# Project Context

## Purpose

A TypeScript npm package that provides an Astro Content Layer loader for Notion databases. This is a fork of the original Notion loader with fixes for image asset handling that works with Astro 5.0+.

The loader allows users to load pages from a Notion database and render them as pages in an Astro collection, with automatic schema generation, image caching, and HTML rendering.

## Tech Stack

- TypeScript (ESM, Node.js 18+)
- Astro Content Layer API
- Notion SDK (`@notionhq/client`)
- Unified/Rehype ecosystem for HTML processing
- Zod for runtime validation
- pnpm as package manager

## Project Conventions

### Code Style

- **Files**: kebab-case (`database-properties.ts`)
- **Variables/Functions**: camelCase (`notionLoader`, `buildProcessor`)
- **Types/Interfaces**: PascalCase (`NotionLoaderOptions`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_IMAGE_SAVE_PATH`)
- **Private fields**: `#prefix` (`#imagePaths`)

### Import Style

1. Type imports first (`import type { Loader } from 'astro/loaders'`)
2. External packages (`import { Client } from '@notionhq/client'`)
3. Local imports with `.js` extensions (`import { buildProcessor } from './render.js'`)

### Formatting (Prettier)

- printWidth: 120
- semi: true
- singleQuote: true
- tabWidth: 2
- trailingComma: 'es5'

### Architecture Patterns

- Each module has single responsibility
- Export types separately from implementations
- Use barrel exports (`index.ts`) for clean public APIs
- Keep utilities pure and functional

### Testing Strategy

- Use Vitest (configured but not yet implemented)
- Place test files in `src/**/*.test.ts` or `tests/` directory
- Mock Notion API calls for unit tests
- Test schema validation with Zod

### Git Workflow

- Standard feature branch workflow
- Build verification before merge

## Domain Context

- **Notion Pages**: Each page in a Notion database becomes an entry in the Astro collection
- **Properties**: Notion database properties are transformed into Zod-validated typed data
- **Blocks**: Page content (blocks) are converted to HTML via rehype pipeline
- **Images**: Notion stores images on AWS S3 with expiring URLs; this loader caches them locally

## Important Constraints

- ESM only (all imports need `.js` extensions for local modules)
- Images must be saved under `src/` directory to be processed by Astro
- Node.js 18+ required
- Astro 5.0+ required as peer dependency

## External Dependencies

- **Notion API**: Primary data source, uses official `@notionhq/client` SDK
- **AWS S3**: Images are hosted on Notion's AWS buckets with expiring URLs
- **Astro Content Layer**: Target integration point (`astro/loaders`)
