## Why

Astro 6 changes the Content Loader API, raises the Node.js runtime floor, and upgrades the bundled Zod version. This package currently targets Astro 5 semantics, so users who upgrade Astro will encounter an unsupported loader contract, stale compatibility guidance, and unclear behavior around helper APIs such as `getImage()`.

## What Changes

- **BREAKING** Raise the supported Astro baseline from v5 to v6 for the next major package release, with an Astro peer dependency range of `>=6 <7`.
- **BREAKING** Raise the supported Node.js runtime baseline to the minimum required by Astro 6.
- Update `notionLoader` to conform to Astro 6's Content Loader API, including the replacement of the async `schema` property with the Astro 6 schema creation contract.
- Preserve the current loader behavior for dynamic schema generation, incremental page loading, rendered output, and cached image imports while making that behavior valid on Astro 6.
- Update exported Zod schemas and dynamic schema generation to remain compatible with Astro 6's Zod 4 environment.
- Clarify and preserve the server-side contract for image helper utilities that depend on `astro:assets`.
- Upgrade `@notionhq/client` as part of the Astro 6 line so the package does not ship the new major release on a stale Notion SDK.
- Refresh package metadata, CI, targeted automated tests, and user documentation so the published package advertises and verifies the correct Astro and Node support matrix.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `notion-loader`: Update the loader interface and compatibility requirements for Astro 6, including dynamic schema creation, supported runtime baselines, and preservation of current loader output semantics.
- `schema-system`: Update schema requirements so exported schemas and data-source-derived schemas remain valid and maintain equivalent data contracts under Astro 6's Zod 4 environment.
- `formatters`: Clarify the behavior and usage constraints of `fileToImageAsset` under Astro 6, where `getImage()` is server-only.

## Impact

- Affected code: `src/loader.ts`, `src/datasource-properties.ts`, `src/schemas/*.ts`, `src/format.ts`, package entry points, test files, and compatibility-facing documentation.
- Affected tooling: `package.json`, CI workflows, local development/runtime requirements, release expectations, and the `@notionhq/client` dependency baseline.
- Affected users: consumers upgrading Astro projects to v6, especially those relying on dynamic collection schemas, generated page types, and helper utilities for Notion file objects.
