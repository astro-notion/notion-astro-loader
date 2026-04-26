import type { RehypePlugins } from 'astro';
import type { Loader } from 'astro/loaders';

import { Client, isFullPage, iteratePaginatedAPI } from '@notionhq/client';
import { dim } from 'kleur/colors';
import * as path from 'node:path';

import { propertiesSchemaForDatasourceProperties } from './datasource-properties.js';
import { VIRTUAL_CONTENT_ROOT } from './image.js';
import { buildProcessor, NotionPageRenderer, type RehypePlugin } from './render.js';
import { notionPageSchema } from './schemas/page.js';
import * as transformedPropertySchema from './schemas/transformed-properties.js';
import type { ClientOptions, DataSourcePropertyConfigResponse, QueryDataSourceParameters } from './types.js';

export interface NotionLoaderOptions
  extends Pick<ClientOptions, 'auth' | 'timeoutMs' | 'baseUrl' | 'notionVersion' | 'fetch' | 'agent'>,
    Pick<QueryDataSourceParameters, 'data_source_id' | 'filter_properties' | 'sorts' | 'filter' | 'in_trash' | 'archived'> {
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
   * The path to save the images.
   * Defaults to 'public'.
   */
  publicPath?: string;
  /**
   * MUST STORED IN `src` TO BE PROCESSED PROPERLY
   * The path to save the images relative to `src`.
   * Defaults to 'assets/images/notion'.
   */
  imageSavePath?: string;
  /**
   * Whether to cache images in the data.
   * Defaults to `false`.
   */
  experimentalCacheImageInData?: boolean;
  /**
   * The root alias for the images.
   * Defaults to `src`.
   */
  experimentalRootSourceAlias?: string;
  /**
   * Include pages that are in the trash.
   * Prefer this over `archived`, which is deprecated in the Notion SDK.
   */
  in_trash?: QueryDataSourceParameters['in_trash'];
  /**
   * @deprecated Use `in_trash` instead.
   */
  archived?: QueryDataSourceParameters['archived'];
}

const DEFAULT_IMAGE_SAVE_PATH = 'assets/images/notion';

/**
 * Notion loader for the Astro Content Layer API.
 *
 * It loads pages from a Notion data source and renders them as entries in an Astro collection.
 *
 * @param options Takes the same options as `notionClient.dataSources.query` and the Notion `Client` constructor.
 *
 * @example
 * // src/content/config.ts
 * import { defineCollection } from "astro:content";
 * import { notionLoader } from "@astro-notion/loader";
 *
 * const posts = defineCollection({
 *   loader: notionLoader({
 *     auth: import.meta.env.NOTION_TOKEN,
 *     data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
 *     filter: {
 *       property: "Hidden",
 *       checkbox: { equals: false },
 *     }
 *   }),
 * });
 */
export function notionLoader({
  data_source_id,
  filter_properties,
  sorts,
  filter,
  in_trash,
  archived,
  collectionName,
  imageSavePath = DEFAULT_IMAGE_SAVE_PATH,
  rehypePlugins = [],
  experimentalCacheImageInData = false,
  experimentalRootSourceAlias = 'src',
  ...clientOptions
}: NotionLoaderOptions): Loader {
  const notionClient = new Client(clientOptions);

  const resolvedRehypePlugins = Promise.all(
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
  );
  const processor = buildProcessor(resolvedRehypePlugins);
  const pageQuery = {
    data_source_id,
    filter_properties,
    sorts,
    filter,
    // Keep the shipped `archived` option working, but forward only the current SDK field.
    ...(in_trash !== undefined ? { in_trash } : archived !== undefined ? { in_trash: archived } : {}),
  } satisfies QueryDataSourceParameters;

  return {
    name: collectionName ? `notion-loader/${collectionName}` : 'notion-loader',
    async createSchema() {
      const dataSource = await notionClient.dataSources.retrieve({ data_source_id });

      return {
        schema: notionPageSchema({
          properties: propertiesSchemaForDatasourceProperties(dataSource.properties),
        }),
        types: typesForDatasourceProperties(dataSource.properties),
      };
    },
    async load(ctx) {
      const { store, logger: log_db, parseData } = ctx;

      const existingPageIds = new Set<string>(store.keys());
      const renderPromises: Promise<void>[] = [];

      log_db.info(`Loading datasource ${dim(`found ${existingPageIds.size} pages in store`)}`);

      const pages = iteratePaginatedAPI(notionClient.dataSources.query, pageQuery);
      let pageCount = 0;

      for await (const page of pages) {
        if (!isFullPage(page)) {
          continue;
        }

        pageCount++;

        const log_pg = log_db.fork(`${log_db.label}/${page.id.slice(0, 6)}`);
        const pageMetadata = getPageMetadata(page);
        const isCached = existingPageIds.delete(page.id);
        const existingPage = store.get(page.id);

        if (existingPage?.digest !== page.last_edited_time || process.env.FORCE_RERENDER) {
          const realSavePath = path.resolve(process.cwd(), 'src', imageSavePath);
          const renderer = new NotionPageRenderer(notionClient, page, realSavePath, log_pg);
          const pageData = await renderer.getPageData(experimentalCacheImageInData, experimentalRootSourceAlias);
          const data = await parseData(pageData);

          const renderPromise = renderer.render(processor).then((rendered) => {
            store.set({
              id: page.id,
              digest: page.last_edited_time,
              data,
              rendered,
              filePath: `${VIRTUAL_CONTENT_ROOT}/${page.id}.md`,
              assetImports: rendered?.metadata.imagePaths,
            });
          });

          renderPromises.push(renderPromise);

          log_pg.info(`${isCached ? 'Updated' : 'Created'} page ${dim(pageMetadata)}`);
        } else {
          log_pg.debug(`Skipped page ${dim(pageMetadata)}`);
        }
      }

      for (const deletedPageId of existingPageIds) {
        const log_pg = log_db.fork(`${log_db.label}/${deletedPageId.slice(0, 6)}`);

        store.delete(deletedPageId);
        log_pg.info(`Deleted page`);
      }

      log_db.info(`Loaded datasource ${dim(`fetched ${pageCount} pages from API`)}`);

      if (renderPromises.length === 0) {
        return;
      }

      log_db.info(`Rendering ${renderPromises.length} updated pages`);
      await Promise.all(renderPromises);
      log_db.info(`Rendered ${renderPromises.length} pages`);
    },
  };
}

/**
 * Get the page metadata in a formatted string.
 *
 * @param page Notion page response to summarize.
 * @returns The formatted page title and last edited date.
 */
function getPageMetadata(page: Parameters<typeof isFullPage>[0] & { properties: Record<string, unknown>; last_edited_time: string }): string {
  const titleProp = Object.entries(page.properties).find(([_, property]) => {
    return typeof property === 'object' && property !== null && 'type' in property && property.type === 'title';
  });
  const pageTitle = transformedPropertySchema.title.safeParse(titleProp ? titleProp[1] : {});
  return [
    `${pageTitle.success ? '"' + pageTitle.data + '"' : 'Untitled'}`,
    `(last edited ${page.last_edited_time.slice(0, 10)})`,
  ].join(' ');
}

/**
 * Generate TypeScript types for the properties of a Notion data source.
 *
 * @param properties The properties of the Notion data source returned by the Notion API.
 * @returns A string containing the TypeScript type definitions for the properties of the Notion data source.
 */
function typesForDatasourceProperties(properties: Record<string, DataSourcePropertyConfigResponse>): string {
  const propertyTypes = Object.entries(properties)
    .map(([name, property]) => `  ${JSON.stringify(name)}: typeof rawPropertySchema.${property.type};`)
    .join('\n');

  return `
import type { z } from 'astro/zod';
import type { notionPageSchema } from '@astro-notion/loader/schemas/page';
import type * as rawPropertySchema from '@astro-notion/loader/schemas/raw-properties';

declare const propertiesSchema: z.ZodObject<{
${propertyTypes}
}>;

export type Entry = z.infer<ReturnType<typeof notionPageSchema<typeof propertiesSchema>>>;
  `.trim();
}
