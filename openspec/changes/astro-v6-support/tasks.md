## 1. Runtime Baseline

- [x] 1.1 Update `package.json` dependency metadata to target Astro 6 with a peer range of `>=6 <7` and the Astro 6 Node.js minimum runtime
- [x] 1.2 Update repository CI workflows to run build and type-check steps on a supported Node.js version
- [x] 1.3 Upgrade `@notionhq/client` and resolve any code or type adjustments required by the newer SDK
- [x] 1.4 Decide and apply the release versioning strategy for the Astro 6-only line

## 2. Loader Contract Migration

- [x] 2.1 Replace the current async `schema` loader property with Astro 6's schema creation contract in `src/loader.ts`
- [x] 2.2 Preserve current loader naming, incremental loading, rendered entry shape, and asset import behavior after the contract update
- [x] 2.3 Verify the upgraded loader remains usable from an Astro 6 content collection definition without legacy compatibility behavior

## 3. Schema And Formatter Compatibility

- [x] 3.1 Audit exported schemas for Astro 6 / Zod 4 compatibility and update incompatible schema expressions
- [x] 3.2 Verify `propertiesSchemaForDatasource` still produces valid data-source-derived schemas with the same parsed value shapes
- [x] 3.3 Confirm `fileToImageAsset` still works in server-side usage and keep its implementation aligned with Astro 6 expectations

## 4. Documentation

- [x] 4.1 Update README installation and usage guidance to advertise Astro 6 and Node 22 support
- [x] 4.2 Remove stale Astro 4 and Astro 5 compatibility guidance that no longer applies to the upgraded release line
- [x] 4.3 Document `fileToImageAsset` as a server-only helper under Astro 6

## 5. Verification

- [x] 5.1 Add targeted unit tests that cover loader creation, dynamic schema generation, and stored entry semantics
- [x] 5.2 Add targeted unit tests that cover exported schema compatibility for representative URL/date/datetime properties
- [x] 5.3 Run build, type-check, and test verification on the upgraded package and resolve any compatibility regressions

## 6. Review Follow-ups

- [x] 6.1 Add an Astro 6 collection-definition smoke verification, or equivalent typed fixture, that imports `defineCollection` and uses `notionLoader` so task 2.3 is verified against Astro's actual config path rather than only object shape
- [x] 6.2 Add targeted `fileToImageAsset` tests that mock `astro:assets` and assert both hosted file URLs and external URLs call `getImage` with `{ src, inferSize: true }`
- [x] 6.3 Align the Astro 6 change spec and project guidance with the implemented data source API by replacing stale `database_id`, Astro 5, and database-only wording where it no longer applies
- [x] 6.4 Update public API comments and examples in `src/loader.ts` to use the current `@astro-notion/loader` package name and data source terminology
- [x] 6.5 Add or explicitly reject `in_trash` support for `notionLoader` data-source query options now that the upgraded Notion SDK marks `archived` as deprecated
