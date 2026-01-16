<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AGENTS.md - Guide for AI Coding Assistants

This file contains essential information for AI coding agents working in this Notion Astro loader repository.

## Project Overview

This is a TypeScript npm package that provides an Astro Content Layer loader for Notion databases. It's a fork of the original Notion loader with fixes for image asset handling.

- **Main technologies**: TypeScript, Astro Content Layer API, Notion SDK, Unified/Rehype, Zod
- **Package manager**: pnpm (required - see packageManager field in package.json)
- **Module system**: ESM (Node.js 18+)

## Essential Commands

### Build Commands

```bash
# Build the project
pnpm run build

# Watch mode for development
pnpm run build:watch

# Clean build artifacts
pnpm run clean

# Build before publishing (runs automatically)
pnpm run prepublishOnly
```

### Testing

```bash
# Currently no tests implemented
pnpm run test  # Returns "No tests available"
```

Note: Vitest is in devDependencies but not configured. When adding tests, use Vitest.

### Code Quality

No dedicated lint/format commands. Use:

```bash
# Format with Prettier (global or npx)
npx prettier --write . --config .prettierrc.cjs

# Type checking
npx tsc --noEmit
```

## Code Style Guidelines

### TypeScript Configuration

- Extends Astro's strictest config (`astro/tsconfigs/strictest`)
- Composite project with declaration maps enabled
- NodeNext module resolution
- Strict type checking with `exactOptionalPropertyTypes: false`

### Import Style

```typescript
// 1. Type imports first
import type { Loader } from 'astro/loaders';
import type { ClientOptions } from './types.js';

// 2. Regular imports (external packages)
import { Client, isFullPage } from '@notionhq/client';
import { dim } from 'kleur/colors';
import * as path from 'node:path';

// 3. Local imports with explicit .js extensions (ESM requirement)
import { buildProcessor } from './render.js';
import { notionPageSchema } from './schemas/page.js';
```

### Naming Conventions

- **Files**: kebab-case (`database-properties.ts`, `image-save-path.ts`)
- **Variables/Functions**: camelCase (`notionLoader`, `buildProcessor`)
- **Types/Interfaces**: PascalCase (`NotionLoaderOptions`, `RenderedNotionEntry`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_IMAGE_SAVE_PATH`, `VIRTUAL_CONTENT_ROOT`)
- **Private fields**: `#prefix` (`#imagePaths`, `#logger`)

### Formatting Rules (Prettier)

```javascript
{
  printWidth: 120,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false
}
```

### Documentation Style

- Use comprehensive JSDoc comments with `@module` for modules
- Include parameter types and return types in JSDoc
- Provide usage examples for complex functions
- Use `/** @type {...} */` for type assertions

### Error Handling Patterns

```typescript
// Standard error handling structure
try {
  const result = await someOperation();
  return result;
} catch (error) {
  logger.error(`Failed to perform operation: ${getErrorMessage(error)}`);
  return defaultValue; // or rethrow if critical
}

// Error message helper
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
```

### Async Patterns

- Prefer `async/await` over Promise chains
- Use `Promise.all` for concurrent operations
- Handle `iteratePaginatedAPI` with async generators
- Proper resource cleanup in try/catch/finally blocks

### Type Safety Guidelines

- Use Zod schemas for runtime validation
- Leverage Notion SDK type guards (`isFullPage`, `isFullDatabase`)
- Create discriminated unions for file types
- Use proper generic constraints

## File Structure & Architecture

```
src/
├── index.ts              # Main exports only
├── loader.ts             # Core Astro loader implementation
├── render.ts             # HTML processing pipeline
├── image.ts              # Image handling utilities
├── types.ts              # Internal type definitions
├── format.ts             # Data transformation utilities
├── database-properties.ts # Dynamic schema generation
├── schemas/              # Zod schemas (exported separately)
└── rehype/
    └── rehype-images.ts  # Custom rehype plugin
```

### Module Principles

- Each module has single responsibility
- Export types separately from implementations
- Use barrel exports (`index.ts`) for clean public APIs
- Keep utilities pure and functional

## Important Development Notes

### ESM Requirements

- All imports must use `.js` extensions for local modules
- Use `node:` prefix for Node.js built-ins
- No default exports unless necessary

### Package Structure

- Multiple export paths configured in package.json
- Main exports: `.`, `./schemas/*`
- Both `import` and `types` fields required per export

### Dependencies

- Never add dependencies without checking existing alternatives
- Prefer Notion SDK methods over custom implementations
- Use existing rehype plugins when available

### When Working with Images

- Images are saved to `src/assets/images/notion` by default
- Public path defaults to `public`
- Use `VIRTUAL_CONTENT_ROOT` for internal paths
- Handle both external and hosted image types

## Testing Guidelines

When adding tests (using Vitest):

- Place test files in `src/**/*.test.ts` or create `tests/` directory
- Test error paths and edge cases
- Mock Notion API calls for unit tests
- Test schema validation with Zod
- Verify image handling logic separately

## Common Pitfalls

1. **Missing .js extensions**: Local imports need explicit extensions
2. **Type imports**: Always use `import type` for type-only imports
3. **Async generators**: `iteratePaginatedAPI` returns async generators
4. **Zod validation**: Runtime schemas should match TypeScript types
5. **Image paths**: Use `path.join()` and absolute paths consistently
6. **Logging**: Use Astro's integration logger with forked loggers
7. **Error messages**: Include context and operation details

## Quality Checklist Before Submitting Changes

- [ ] Code builds with `pnpm run build`
- [ ] Type checking passes (`tsc --noEmit`)
- [ ] Code formatted with Prettier
- [ ] Imports follow the established order
- [ ] Error handling is consistent
- [ ] JSDoc comments are present for public APIs
- [ ] Private fields use `#` prefix
- [ ] Local imports use `.js` extensions
- [ ] New types are exported from appropriate modules
- [ ] Schema changes are reflected in Zod validation
