import { isFullBlock, iteratePaginatedAPI, type Client } from '@notionhq/client';
import type { AstroIntegrationLogger, MarkdownHeading } from 'astro';
import { type ParseDataOptions } from 'astro/loaders';
import { dim } from 'kleur/colors';

import { downloadFile, resolveAssetPath } from './asset.js';
import { type AssetObject, type NotionPageData, type Page, type RehypePlugin } from './types.js';
import { awaitAll } from './utils.js';

// #region Processor
import * as fse from 'fs-extra';
import { unified } from 'unified';
import { type VFile } from 'vfile';

import notionRehype from '@ntcho/notion-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

import type { HtmlElementNode, ListNode, TextNode } from '@jsdevtools/rehype-toc';
import { toc as rehypeToc } from '@jsdevtools/rehype-toc';

import { rehypeAssets } from './rehype/rehype-assets.js';

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

  return async function process(blocks: unknown[], assetPaths: string[]) {
    const processor = await processorPromise.then((p) => p().use(rehypeAssets(), { assetPaths }));
    const vFile = (await processor.process({ data: blocks } as Record<string, unknown>)) as VFile;
    return { vFile, headings };
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
export interface RenderedNotionPage {
  /** Rendered HTML string. If present then `render(entry)` will return a component that renders this HTML. */
  html: string;
  metadata: {
    /**
     * Any images that are present in this entry. Relative to the DataEntry filePath.
     * NOTE: chanigng this to `assetPaths` will break the Astro Content Loader API
     */
    imagePaths: string[];
    /** Any headings that are present in this file. Returned as `headings` from `render()` */
    headings: MarkdownHeading[];
    /** List of Notion blocks that were rendered in the HTML. */
    blocks: any[];
  };
}

export class NotionPageRenderer {
  #assetPaths: string[] = [];
  #assetAnalytics = { download: 0, cached: 0 };
  #logger: AstroIntegrationLogger;

  /**
   * @param client Notion API client.
   * @param page Notion page object including page ID and properties. Does not include blocks.
   * @param parentLogger Logger to use for logging messages.
   */
  constructor(
    private readonly client: Client,
    private readonly page: Page,
    public readonly assetPath: string,
    logger: AstroIntegrationLogger
  ) {
    this.#logger = logger.fork(`${logger.label}/render`);
  }

  /**
   * Return rendered HTML for the page.
   * @param process Processor function to transform Notion blocks into HTML.
   * This is created once for all pages then shared.
   */
  async render(
    process: ReturnType<typeof buildProcessor>
  ): Promise<{ data?: ParseDataOptions<NotionPageData>; rendered?: RenderedNotionPage }> {
    try {
      this.#logger.debug(`Generating page metadata`);
      const data = await this.#getPageData();
      this.#logger.debug(`Generated page metadata ${dim(`${this.#assetPaths.length} assets found`)}`);

      this.#logger.debug(`Fetching page content`);
      const blocks = await awaitAll(this.fetchBlocks(this.client, this.page.id));
      this.#logger.debug(`Fetched page content ${dim(`${blocks.length} blocks found`)}`);

      if (this.#assetAnalytics.download > 0 || this.#assetAnalytics.cached > 0) {
        this.#logger.info(
          [
            `Found ${this.#assetAnalytics.download} assets to download`,
            this.#assetAnalytics.cached > 0 ? dim(`${this.#assetAnalytics.cached} already cached`) : '',
          ].join(' ')
        );
      }

      this.#logger.debug(`Rendering page`);
      const { vFile, headings } = await process(blocks, this.#assetPaths);
      this.#logger.debug('Rendered page');

      return {
        data,
        rendered: {
          html: vFile.toString(),
          metadata: {
            headings,
            imagePaths: this.#assetPaths,
            blocks,
          },
        },
      };
    } catch (error) {
      this.#logger.error(`Failed to render: ${JSON.stringify(error)}`);
      console.error(error);
      return {};
    }
  }

  /**
   * Create data for Astro Content Store, including page metadata and properties.
   *
   * Properties with Notion-hosted assets are transformed to local paths.
   */
  async #getPageData(): Promise<ParseDataOptions<NotionPageData>> {
    const { page } = this;

    // transform cover image file
    let cover = await this.#fetchAsset(page.cover);

    // transform icon image file
    let icon = await this.#fetchAsset(page.icon);

    // transform file properties
    let properties = page.properties;
    for (const [_, prop] of Object.entries(properties)) {
      if (prop.type === 'files') {
        // @ts-ignore files will be AssetObject[]
        prop.files = await Promise.all(prop.files.map(async (f) => await this.#fetchAsset(f)));
      }
    }

    return {
      id: page.id,
      data: { ...page, icon, cover, properties },
    };
  }

  /**
   * Helper function to download Notion-hosted files to local storage.
   * Additionally saves the path in `this.#imagePaths`.
   * @param fileObject Notion file object representing an image.
   * @param resolvePath Whether to resolve the path to a local file. If true, the path will start with `src/${assetPath}`.
   * @returns Local path to the image, or undefined if the image could not be fetched.
   */
  async #fetchAsset<T extends AssetObject>(fileObject: T, resolvePath: boolean = true): Promise<T> {
    try {
      if (fileObject === null || fileObject.type !== 'file') {
        // TODO: support downloading external files
        return fileObject; // return the original object if not a Notion-hosted file
      }

      fse.ensureDirSync(this.assetPath);

      const filePath = await downloadFile(fileObject.file.url, this.assetPath, {
        log: (msg) => this.#logger.debug(msg),
        tag: (type) => this.#assetAnalytics[type]++,
      });

      this.#assetPaths.push(filePath);
      return {
        ...fileObject,
        file: {
          ...fileObject.file,
          url: resolvePath ? resolveAssetPath(filePath) : filePath,
        },
      };
    } catch (error) {
      this.#logger.error(`Failed to fetch image: ${JSON.stringify(error)}`);
      console.error(error);

      // Fall back to using the remote URL directly
      return fileObject;
    }
  }

  /**
   * Return a generator that yields all blocks in a Notion page, recursively.
   * @param blockId ID of block to get children for.
   */
  async *fetchBlocks(client: Client, blockId: string) {
    this.#logger.debug(`Fetching block ${blockId}`);
    for await (const block of iteratePaginatedAPI(client.blocks.children.list, {
      block_id: blockId,
    })) {
      if (!isFullBlock(block)) continue;

      if (block.has_children) {
        this.#logger.debug(`Fetching children of block ${block.id}`);
        const children = await awaitAll(this.fetchBlocks(client, block.id));

        // @ts-ignore -- children doesn't exist in the type definition
        block[block.type].children = children;
      }

      // Handle blocks with potential Notion-hosted assets
      switch (block.type) {
        // Duplicated due to TS type narrowing. This can be written as:
        // { ...block, [block.type]: await this.#fetchAsset(block[block.type]) },
        // but unfortunately TS doesn't understand Notion's block type system.
        case 'file':
          yield { ...block, file: await this.#fetchAsset(block.file) };
          break;
        case 'image':
          yield { ...block, image: await this.#fetchAsset(block.image, false) };
          break;
        case 'video':
          yield { ...block, video: await this.#fetchAsset(block.video) };
          break;
        case 'audio':
          yield { ...block, audio: await this.#fetchAsset(block.audio) };
          break;
        case 'callout':
          yield {
            ...block,
            [block.type]: {
              ...block[block.type],
              icon: await this.#fetchAsset(block[block.type].icon, false),
            },
          };
          break;
        default:
          yield block;
      }
    }
  }
}

// function getErrorMessage(error: unknown): string {
//   if (error instanceof Error) {
//     return error.message;
//   } else if (typeof error === 'string') {
//     return error;
//   } else {
//     return 'Unknown error';
//   }
// }
