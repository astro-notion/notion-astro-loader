import type { AstroIntegrationLogger, RehypePlugins } from 'astro';
import type { Loader } from 'astro/loaders';

import { Client, isFullPage, iteratePaginatedAPI } from '@notionhq/client';
import { dim } from 'kleur/colors';
import * as path from 'node:path';

import { propertiesSchemaForDatabase } from './database-properties.js';
import { VIRTUAL_CONTENT_ROOT } from './asset.js';
import { buildProcessor, NotionPageRenderer } from './render.js';
import { notionPageSchema } from './schemas/page.js';
import * as transformedPropertySchema from './schemas/transformed-properties.js';
import type { ClientOptions, Page, QueryDatabaseParameters, RehypePlugin } from './types.js';

export interface NotionLoaderOptions
  extends Pick<ClientOptions, 'auth' | 'timeoutMs' | 'baseUrl' | 'notionVersion' | 'fetch' | 'agent'>,
    Pick<QueryDatabaseParameters, 'database_id' | 'filter_properties' | 'sorts' | 'filter' | 'archived'> {
  /**
   * Pass rehype plugins to customize how the Notion output HTML is processed.
   * You can import and apply the plugin function (recommended), or pass the plugin name as a string.
   */
  rehypePlugins?: RehypePlugins;
  /**
   * The name of the collection, only used for logging and debugging purposes.
   * Useful for multiple loaders to differentiate their logs.
   */
  collectionName?: string;
  /**
   * The path to download Notion-hosted files to (file uploads, images, icons).
   * Defaults to 'assets/notion', downloading files to `src/assets/notion`.
   */
  assetPath?: string;
}

/**
 * Notion loader for the Astro Content Layer API.
 *
 * It allows you to load pages from a Notion database then render them as pages in a collection.
 *
 * @param options Takes in same options as `notionClient.databases.query` and `Client` constructor.
 *
 * @example
 * // src/content/config.ts
 * import { defineCollection } from "astro:content";
 * import { notionLoader } from "notion-astro-loader";
 *
 * const database = defineCollection({
 *   loader: notionLoader({
 *     auth: import.meta.env.NOTION_TOKEN,
 *     database_id: import.meta.env.NOTION_DATABASE_ID,
 *     filter: {
 *       property: "Hidden",
 *       checkbox: { equals: false },
 *     }
 *   }),
 * });
 */
export function notionLoader({
  database_id,
  filter_properties,
  sorts,
  filter,
  archived,
  collectionName,
  assetPath = 'assets/notion',
  rehypePlugins = [],
  ...clientOptions
}: NotionLoaderOptions): Loader {
  // Initialize client for Notion API requests
  const client = new Client(clientOptions);

  // Initialize the rehype processor for rendering
  const processor = buildProcessor(
    Promise.all(
      // Load all rehype plugins if needed
      rehypePlugins.map(async (config) => {
        let plugin: RehypePlugin | string;
        let options: any;
        if (Array.isArray(config)) {
          [plugin, options] = config;
        } else {
          plugin = config;
        }

        if (typeof plugin === 'string') {
          plugin = (await import(/* @vite-ignore */ plugin)).default as RehypePlugin;
        }
        return [plugin, options] as const;
      })
    )
  );

  return {
    name: collectionName ? `notion-loader/${collectionName}` : 'notion-loader',
    schema: async () =>
      notionPageSchema({
        properties: await propertiesSchemaForDatabase(client, database_id),
      }),
    load: async ({ store, logger: log_db, parseData }) => {
      const cachedPageIds = new Set<string>(store.keys());

      log_db.info(`Loading database ${dim(`found ${cachedPageIds.size} pages in store`)}`);

      const pages = iteratePaginatedAPI(client.databases.query, {
        database_id,
        filter_properties,
        sorts,
        filter,
        archived,
      });

      // Number of full pages fetched from API
      let pageCount = 0;

      const renderers: Promise<void>[] = [];

      for await (const page of pages) {
        // Only process full pages
        if (!isFullPage(page)) continue;

        pageCount++;

        // Fork logger with a unique label for each page
        const log_pg = getPageLogger(log_db, page.id);

        const cachedPage = store.get(page.id);
        const isCached = cachedPageIds.delete(page.id); // used to check which pages were deleted
        const pageMetadata = getPageMetadata(page);

        const absoluteAssetPath = path.resolve(process.cwd(), 'src', assetPath);

        // If the page has been updated, re-render it
        if (cachedPage?.digest !== page.last_edited_time || process.env.FORCE_RERENDER) {
          // Create renderer for current page
          const renderer = new NotionPageRenderer(client, page, absoluteAssetPath, log_pg);

          const renderPromise = renderer.render(processor).then(async ({ data, rendered }) => {
            if (data === undefined || rendered === undefined) return;

            store.set({
              id: page.id,
              digest: page.last_edited_time,
              data: await parseData(data),
              rendered,
              filePath: `${VIRTUAL_CONTENT_ROOT}/${page.id}.md`,
              assetImports: rendered?.metadata.imagePaths,
            });
          });

          renderers.push(renderPromise);

          log_pg.info(`${isCached ? 'Updated' : 'Created'} page ${dim(pageMetadata)}`);
        } else {
          log_pg.debug(`Skipped page ${dim(pageMetadata)}`);
        }
      }

      // Remove any pages that were not found in the API
      for (const deletedPageId of cachedPageIds) {
        const log_pg = getPageLogger(log_db, deletedPageId);

        store.delete(deletedPageId);
        log_pg.info(`Deleted page`);
      }

      log_db.info(`Loaded database ${dim(`fetched ${pageCount} pages from API`)}`);

      // Skip rendering if no pages were updated
      if (renderers.length === 0) return;

      // Wait for rendering to complete
      log_db.info(`Rendering ${renderers.length} updated pages`);
      await Promise.all(renderers);
      log_db.info(`Rendered ${renderers.length} pages`);
    },
  };
}

/**
 * Get the page metadata in a formatted string.
 */
function getPageMetadata(page: Page): string {
  const titleProp = Object.entries(page.properties).find(([_, property]) => property.type === 'title');
  const pageTitle = transformedPropertySchema.title.safeParse(titleProp ? titleProp[1] : {});
  return [
    `${pageTitle.success ? '"' + pageTitle.data + '"' : 'Untitled'}`,
    `(last edited ${page.last_edited_time.slice(0, 10)})`,
  ].join(' ');
}

/**
 * Get a logger for a specific page, with a unique label based on the page ID.
 */
function getPageLogger(log_db: AstroIntegrationLogger, pageId: string) {
  return log_db.fork(`${log_db.label}/${pageId.slice(0, 3)}..${pageId.slice(-3)}`);
}
