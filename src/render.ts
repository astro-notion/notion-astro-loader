import type { AstroIntegrationLogger, MarkdownHeading } from 'astro';
import type { ParseDataOptions } from 'astro/loaders';

// #region Processor
import * as fse from 'fs-extra';
import notionRehype from 'notion-rehype-k';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { unified, type Plugin } from 'unified';
import type { VFile } from 'vfile';

import type { HtmlElementNode, ListNode, TextNode } from '@jsdevtools/rehype-toc';
import { toc as rehypeToc } from '@jsdevtools/rehype-toc';
import { isFullBlock, iteratePaginatedAPI, type Client } from '@notionhq/client';
import { dim } from 'kleur/colors';

import { fileToUrl } from './format.js';
import { saveImageFromAWS, transformImagePathForCover } from './image.js';
import { rehypeImages } from './rehype/rehype-images.js';
import type { AssetObject, FileObject, NotionPageData, PageObjectResponse } from './types.js';

export type RehypePlugin = Plugin<any[], any>;

const baseProcessor = unified()
  // @ts-ignore
  .use(notionRehype, {}) // Parse Notion blocks to rehype AST
  .use(rehypeSlug)
  // @ts-ignore
  .use(rehypeKatex) // Then you can use any rehype plugins to enrich the AST
  .use(rehypeStringify); // Turn AST to HTML string

export function buildProcessor(rehypePlugins: Promise<ReadonlyArray<readonly [RehypePlugin, any]>>) {
  let headings: MarkdownHeading[] = [];

  const processorWithToc = baseProcessor().use(rehypeToc, {
    customizeTOC(toc) {
      headings = extractTocHeadings(toc);
      return false;
    },
  });
  const processorPromise = rehypePlugins.then((plugins) => {
    let processor = processorWithToc;
    for (const [plugin, options] of plugins) {
      processor = processor.use(plugin, options);
    }
    return processor;
  });

  return async function process(blocks: unknown[], imagePaths: string[]) {
    const processor = await processorPromise.then((p) => p().use(rehypeImages(), { imagePaths }));
    const vFile = (await processor.process({ data: blocks } as Record<string, unknown>)) as VFile;
    return { vFile, headings };
  };
}

async function awaitAll<T>(iterable: AsyncIterable<T>) {
  const result: T[] = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
}

/**
 * Return a generator that yields all blocks in a Notion page, recursively.
 *
 * @param client Notion API client.
 * @param blockId ID of block to get children for.
 * @param fetchAsset Function that fetches an asset and returns an updated Notion asset object.
 * @returns Full Notion blocks with asset URLs transformed for rendering.
 */
async function* listBlocks(client: Client, blockId: string, fetchAsset: <T extends AssetObject>(asset: T) => Promise<T>) {
  for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
    block_id: blockId,
  })) {
    if (!isFullBlock(block)) {
      continue;
    }

    if (block.has_children) {
      const children = await awaitAll(listBlocks(client, block.id, fetchAsset));

      // @ts-ignore -- children doesn't exist in the type definition.
      block[block.type].children = children;
    }

    switch (block.type) {
      case 'file':
        yield { ...block, file: await getRenderableAsset(block.file, fetchAsset) };
        break;
      case 'image':
        yield { ...block, image: await getRenderableAsset(block.image, fetchAsset) };
        break;
      case 'video':
        yield { ...block, video: await getRenderableAsset(block.video, fetchAsset) };
        break;
      case 'audio':
        yield { ...block, audio: await getRenderableAsset(block.audio, fetchAsset) };
        break;
      case 'callout':
        yield {
          ...block,
          callout: {
            ...block.callout,
            icon: block.callout.icon ? await getRenderableIcon(block.callout.icon, fetchAsset) : block.callout.icon,
          },
        };
        break;
      default:
        yield block;
    }
  }
}

async function getRenderableAsset<T extends FileObject>(
  asset: T,
  fetchAsset: <Asset extends AssetObject>(asset: Asset) => Promise<Asset>
) {
  const fetchedAsset = await fetchAsset(asset);
  const url = fileToUrl(fetchedAsset);

  if (!url) {
    return asset;
  }

  // notion-rehype-k expects the selected file field as a URL string instead of a Notion file object.
  return {
    ...asset,
    type: fetchedAsset.type,
    [fetchedAsset.type]: url,
  };
}

async function getRenderableIcon<T extends AssetObject>(
  icon: T,
  fetchAsset: <Asset extends AssetObject>(asset: Asset) => Promise<Asset>
) {
  if (icon.type === 'emoji') {
    return icon;
  }

  const fetchedIcon = await fetchAsset(icon);
  const url = fileToUrl(fetchedIcon);

  if (!url) {
    return { type: 'emoji' as const, emoji: '' };
  }

  if (fetchedIcon.type === 'custom_emoji') {
    return { type: 'external' as const, external: url };
  }

  return {
    type: fetchedIcon.type,
    [fetchedIcon.type]: url,
  };
}

function extractTocHeadings(toc: HtmlElementNode): MarkdownHeading[] {
  if (toc.tagName !== 'nav') {
    throw new Error(`Expected nav, got ${toc.tagName}`);
  }

  function listElementToTree(ol: ListNode, depth: number): MarkdownHeading[] {
    return ol.children.flatMap((li) => {
      const [_link, subList] = li.children;
      const link = _link as HtmlElementNode;

      const currentHeading: MarkdownHeading = {
        depth,
        text: (link.children![0] as TextNode).value,
        slug: link.properties.href!.slice(1),
      };

      let headings = [currentHeading];
      if (subList) {
        headings = headings.concat(listElementToTree(subList as ListNode, depth + 1));
      }
      return headings;
    });
  }

  return listElementToTree(toc.children![0] as ListNode, 0);
}
// #endregion

/**
 * Represents a rendered Notion page that has been processed and prepared for rendering.
 *
 * Extends `RenderedContent` object: https://docs.astro.build/en/reference/content-loader-reference/#rendered
 */
export interface RenderedNotionEntry {
  /** Rendered HTML string. If present then `render(entry)` will return a component that renders this HTML. */
  html: string;
  metadata: {
    /** Any images that are present in this entry. Relative to the DataEntry filePath. */
    imagePaths: string[];
    /** Any headings that are present in this file. Returned as `headings` from `render()` */
    headings: MarkdownHeading[];
  };
}

export class NotionPageRenderer {
  #assetPaths: string[] = [];
  #assetAnalytics = {
    download: 0,
    cached: 0,
  };
  #logger: AstroIntegrationLogger;

  /**
   * @param client Notion API client.
   * @param page Notion page object including page ID and properties. Does not include blocks.
   * @param imageSavePath Directory where Notion-hosted assets are saved.
   * @param logger Logger to use for rendering messages.
   */
  constructor(
    private readonly client: Client,
    private readonly page: PageObjectResponse,
    public readonly imageSavePath: string,
    logger: AstroIntegrationLogger
  ) {
    this.#logger = logger.fork(`${logger.label}/render`);
  }

  /**
   * Return page properties for Astro to use.
   *
   * @param transformCoverImage Whether Notion-hosted cover images should be saved and rewritten.
   * @param rootAlias Alias prepended to transformed cover image paths.
   * @returns Page data suitable for Astro's `parseData` loader helper.
   */
  async getPageData(transformCoverImage = false, rootAlias = 'src'): Promise<ParseDataOptions<NotionPageData>> {
    const { page } = this;
    let cover = page.cover;
    let icon = page.icon;
    let properties = page.properties;

    if (cover && transformCoverImage && cover.type === 'file') {
      const fetchedCover = await this.#fetchAsset(cover);
      const coverPath = fileToUrl(fetchedCover);
      if (coverPath && fetchedCover.type === 'file') {
        const transformedUrl = `${rootAlias}/${transformImagePathForCover(coverPath)}`;
        cover = {
          ...cover,
          file: {
            ...cover.file,
            url: transformedUrl,
          },
        };
      }
    }

    if (transformCoverImage) {
      icon = icon ? await this.#fetchAsset(icon) : icon;
      properties = await this.#getPagePropertiesWithFetchedAssets();
    }

    return {
      id: page.id,
      data: {
        icon,
        cover,
        archived: page.archived,
        in_trash: page.in_trash,
        url: page.url,
        public_url: page.public_url,
        properties,
      },
    };
  }

  async #getPagePropertiesWithFetchedAssets(): Promise<PageObjectResponse['properties']> {
    const properties = { ...this.page.properties };

    for (const [propertyName, property] of Object.entries(properties)) {
      if (property.type !== 'files') {
        continue;
      }

      properties[propertyName] = {
        ...property,
        files: await Promise.all(property.files.map(async (file) => this.#fetchAsset(file))),
      };
    }

    return properties;
  }

  /**
   * Return rendered HTML for the page.
   *
   * @param process Processor function to transform Notion blocks into HTML.
   * This is created once for all pages then shared.
   * @returns Rendered HTML and metadata, or undefined if rendering failed.
   */
  async render(process: ReturnType<typeof buildProcessor>): Promise<RenderedNotionEntry | undefined> {
    this.#logger.debug('Rendering page');

    try {
      const blocks = await awaitAll(listBlocks(this.client, this.page.id, this.#fetchAsset));

      if (this.#assetAnalytics.download > 0 || this.#assetAnalytics.cached > 0) {
        this.#logger.info(
          [
            `Found ${this.#assetAnalytics.download} assets to download`,
            this.#assetAnalytics.cached > 0 ? dim(`${this.#assetAnalytics.cached} already cached`) : '',
          ].join(' ')
        );
      }

      const { vFile, headings } = await process(blocks, this.#assetPaths);
      this.#logger.debug('Rendered page');

      return {
        html: vFile.toString(),
        metadata: {
          headings,
          imagePaths: this.#assetPaths,
        },
      };
    } catch (error) {
      this.#logger.error(`Failed to render: ${getErrorMessage(error)}`);
      return undefined;
    }
  }

  #fetchAsset = async <T extends AssetObject>(assetObject: T): Promise<T> => {
    try {
      if (assetObject.type !== 'file') {
        return assetObject;
      }

      fse.ensureDirSync(this.imageSavePath);
      const assetUrl = await saveImageFromAWS(assetObject.file.url, this.imageSavePath, {
        log: (message) => {
          this.#logger.debug(message);
        },
        tag: (type) => {
          this.#assetAnalytics[type]++;
        },
      });

      this.#assetPaths.push(assetUrl);
      return {
        ...assetObject,
        file: {
          ...assetObject.file,
          url: assetUrl,
        },
      };
    } catch (error) {
      this.#logger.error(`Failed to fetch asset: ${getErrorMessage(error)}`);

      return assetObject;
    }
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}
