/**
 * Verifies recursive Notion rendering and stable page-data asset semantics.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPage, createRichText } from './fixtures/notion.js';

const notionBlocks = vi.hoisted(() => ({
  byParent: new Map<string, any[]>(),
}));

const assetApi = vi.hoisted(() => ({
  saveNotionAsset: vi.fn(),
}));

vi.mock('@notionhq/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@notionhq/client')>();

  return {
    ...original,
    isFullBlock: (block: { object?: string; type?: string } | null | undefined) =>
      block?.object === 'block' && typeof block.type === 'string' && block.type in block,
    iteratePaginatedAPI: vi.fn(async function* (_query: unknown, params: { block_id: string }) {
      for (const block of notionBlocks.byParent.get(params.block_id) ?? []) {
        yield block;
      }
    }),
  };
});

vi.mock('astro:assets', () => ({
  getImage: vi.fn(),
}));

vi.mock('../src/asset.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/asset.js')>();
  return { ...original, saveNotionAsset: assetApi.saveNotionAsset };
});

import { buildProcessor, NotionPageRenderer, type RehypePlugin } from '../src/render.js';

let imageSavePath: string;
let publicAssetPath: string;

/** Creates the logger surface used by `NotionPageRenderer`. */
function createLogger() {
  const logger = {
    label: 'renderer-test',
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    fork: vi.fn(),
  };
  logger.fork.mockReturnValue(logger);
  return logger;
}

beforeEach(async () => {
  imageSavePath = await mkdtemp(join(tmpdir(), 'notion-render-'));
  publicAssetPath = join(imageSavePath, 'public', 'notion-assets');
});

afterEach(async () => {
  notionBlocks.byParent.clear();
  assetApi.saveNotionAsset.mockReset();
  vi.restoreAllMocks();
  await rm(imageSavePath, { recursive: true, force: true });
});

describe('buildProcessor', () => {
  it('isolates headings when asynchronous plugin processing overlaps', async () => {
    let pluginInvocation = 0;
    let releaseFirstPlugin!: () => void;
    let notifyFirstPluginStarted!: () => void;
    const firstPluginStarted = new Promise<void>((resolve) => {
      notifyFirstPluginStarted = resolve;
    });
    const firstPluginRelease = new Promise<void>((resolve) => {
      releaseFirstPlugin = resolve;
    });
    const overlappingPlugin: RehypePlugin = () => async () => {
      pluginInvocation += 1;
      if (pluginInvocation === 1) {
        notifyFirstPluginStarted();
        await firstPluginRelease;
      }
    };
    const process = buildProcessor(Promise.resolve([[overlappingPlugin, undefined]]));
    const firstBlocks = [
      {
        object: 'block',
        id: 'first-heading',
        type: 'heading_1',
        has_children: false,
        heading_1: { rich_text: [createRichText('First page')], is_toggleable: false, color: 'default' },
      },
    ];
    const secondBlocks = [
      {
        object: 'block',
        id: 'second-heading',
        type: 'heading_1',
        has_children: false,
        heading_1: { rich_text: [createRichText('Second page')], is_toggleable: false, color: 'default' },
      },
    ];

    const firstRender = process(firstBlocks, []);
    await firstPluginStarted;
    const secondRender = await process(secondBlocks, []);
    releaseFirstPlugin();
    const firstRenderResult = await firstRender;

    expect(String(firstRenderResult.vFile)).toContain('<h1 id="first-page">First page</h1>');
    expect(firstRenderResult.headings).toEqual([{ depth: 0, text: 'First page', slug: 'first-page' }]);
    expect(String(secondRender.vFile)).toContain('<h1 id="second-page">Second page</h1>');
    expect(secondRender.headings).toEqual([{ depth: 0, text: 'Second page', slug: 'second-page' }]);
  });
});

describe('NotionPageRenderer.render', () => {
  it('renders recursive blocks, semantic headings, and local image metadata through the real processor', async () => {
    const page = createPage();
    const hostedImageUrl =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/image/image.png?signature=secret';
    const hostedPdfUrl =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/document/document.pdf?signature=secret';
    const imagePath = '../../assets/images/notion/parent/image.png';
    const pdfPath = 'parent/document.pdf';
    const videoPath = 'parent/video.mp4';
    const externalImageUrl = 'https://images.example.com/external.png';
    const externalAudioUrl = 'https://media.example.com/external.mp3';
    assetApi.saveNotionAsset
      .mockResolvedValueOnce(imagePath)
      .mockResolvedValueOnce(pdfPath)
      .mockResolvedValueOnce(videoPath);

    notionBlocks.byParent.set(page.id, [
      {
        object: 'block',
        id: 'heading-1',
        type: 'heading_1',
        has_children: false,
        heading_1: { rich_text: [createRichText('Overview')], is_toggleable: false, color: 'default' },
      },
      {
        object: 'block',
        id: 'toggle-1',
        type: 'toggle',
        has_children: true,
        toggle: { rich_text: [createRichText('Details')], color: 'default' },
      },
      {
        object: 'block',
        id: 'list-item-1',
        type: 'bulleted_list_item',
        has_children: false,
        bulleted_list_item: { rich_text: [createRichText('List item')], color: 'default' },
      },
      {
        object: 'block',
        id: 'image-1',
        type: 'image',
        has_children: false,
        image: {
          type: 'file',
          file: { url: hostedImageUrl, expiry_time: '2026-04-25T12:00:00.000Z' },
          caption: [],
        },
      },
      {
        object: 'block',
        id: 'pdf-1',
        type: 'pdf',
        has_children: false,
        pdf: {
          type: 'file',
          file: { url: hostedPdfUrl, expiry_time: '2026-04-25T12:00:00.000Z' },
          caption: [],
        },
      },
      {
        object: 'block',
        id: 'video-1',
        type: 'video',
        has_children: false,
        video: {
          type: 'file',
          file: {
            url: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/video/video.mp4',
            expiry_time: '2026-04-25T12:00:00.000Z',
          },
          caption: [],
        },
      },
      {
        object: 'block',
        id: 'image-external',
        type: 'image',
        has_children: false,
        image: { type: 'external', external: { url: externalImageUrl }, caption: [] },
      },
      {
        object: 'block',
        id: 'audio-external',
        type: 'audio',
        has_children: false,
        audio: { type: 'external', external: { url: externalAudioUrl }, caption: [] },
      },
    ]);
    notionBlocks.byParent.set('toggle-1', [
      {
        object: 'block',
        id: 'paragraph-1',
        type: 'paragraph',
        has_children: false,
        paragraph: { rich_text: [createRichText('Nested content')], color: 'default' },
      },
    ]);

    const client = { blocks: { children: { list: vi.fn() } } };
    const renderer = new NotionPageRenderer(
      client as never,
      page as never,
      imageSavePath,
      createLogger() as never,
      publicAssetPath,
      '/docs/notion-assets'
    );

    const rendered = await renderer.render(buildProcessor(Promise.resolve([])));

    expect(rendered?.html).toContain('<h1 id="overview">Overview</h1>');
    expect(rendered?.html).toContain('<details');
    expect(rendered?.html).toContain('<summary>Details</summary>');
    expect(rendered?.html).toContain('<p>Nested content</p>');
    expect(rendered?.html).toContain('<li>List item</li>');
    expect(rendered?.html).toContain('__ASTRO_IMAGE_');
    expect(rendered?.html).toContain('href="/docs/notion-assets/parent/document.pdf"');
    expect(rendered?.html).toContain('/docs/notion-assets/parent/video.mp4');
    expect(rendered?.html).toContain(externalImageUrl);
    expect(rendered?.html).toContain(externalAudioUrl);
    expect(rendered?.metadata.headings).toEqual([{ depth: 0, text: 'Overview', slug: 'overview' }]);
    expect(rendered?.metadata.imagePaths).toEqual([imagePath]);
    expect(assetApi.saveNotionAsset).toHaveBeenNthCalledWith(1, hostedImageUrl, imageSavePath, expect.any(Object));
    expect(assetApi.saveNotionAsset).toHaveBeenNthCalledWith(2, hostedPdfUrl, publicAssetPath, expect.any(Object));
    expect(assetApi.saveNotionAsset).toHaveBeenCalledTimes(3);
  });
});

describe('NotionPageRenderer.getPageData', () => {
  it('rewrites hosted covers and file icons with stable local path semantics', async () => {
    const coverUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/cover/cover.png?signature=cover';
    const iconUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/icon/icon.png?signature=icon';
    const page = createPage({
      cover: { type: 'file', file: { url: coverUrl, expiry_time: '2026-04-25T12:00:00.000Z' } },
      icon: { type: 'file', file: { url: iconUrl, expiry_time: '2026-04-25T12:00:00.000Z' } },
    });
    assetApi.saveNotionAsset
      .mockResolvedValueOnce('../../assets/images/notion/parent/cover.png')
      .mockResolvedValueOnce('../../assets/images/notion/parent/icon.png');

    const client = { blocks: { children: { list: vi.fn() } } };
    const renderer = new NotionPageRenderer(client as never, page as never, imageSavePath, createLogger() as never);

    const pageData = await renderer.getPageData(true, 'content-root');

    expect(pageData.data.cover).toMatchObject({
      type: 'file',
      file: { url: 'content-root/assets/images/notion/parent/cover.png' },
    });
    expect(pageData.data.icon).toMatchObject({
      type: 'file',
      file: { url: '../../assets/images/notion/parent/icon.png' },
    });
    expect(assetApi.saveNotionAsset).toHaveBeenNthCalledWith(1, coverUrl, imageSavePath, expect.any(Object));
    expect(assetApi.saveNotionAsset).toHaveBeenNthCalledWith(2, iconUrl, imageSavePath, expect.any(Object));
  });

  it('preserves external covers and emoji icons', async () => {
    const cover = { type: 'external' as const, external: { url: 'https://images.example.com/cover.png' } };
    const icon = { type: 'emoji' as const, emoji: 'N' };
    const page = createPage({ cover, icon });

    const client = { blocks: { children: { list: vi.fn() } } };
    const renderer = new NotionPageRenderer(client as never, page as never, imageSavePath, createLogger() as never);

    const pageData = await renderer.getPageData(true, 'content-root');

    expect(pageData.data.cover).toEqual(cover);
    expect(pageData.data.icon).toEqual(icon);
    expect(assetApi.saveNotionAsset).not.toHaveBeenCalled();
  });
});
