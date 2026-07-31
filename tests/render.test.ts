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

const imageApi = vi.hoisted(() => ({
  saveImageFromAWS: vi.fn(),
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

vi.mock('../src/image.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/image.js')>();
  return { ...original, saveImageFromAWS: imageApi.saveImageFromAWS };
});

import { buildProcessor, NotionPageRenderer } from '../src/render.js';

let imageSavePath: string;

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
});

afterEach(async () => {
  notionBlocks.byParent.clear();
  imageApi.saveImageFromAWS.mockReset();
  vi.restoreAllMocks();
  await rm(imageSavePath, { recursive: true, force: true });
});

describe('NotionPageRenderer.render', () => {
  it('renders recursive blocks, semantic headings, and local image metadata through the real processor', async () => {
    const page = createPage();
    const hostedImageUrl =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/image/image.png?signature=secret';
    const hostedPdfUrl =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/document/document.pdf?signature=secret';
    const imagePath = '../../assets/images/notion/parent/image.png';
    const pdfPath = '../../assets/images/notion/parent/document.pdf';
    imageApi.saveImageFromAWS.mockResolvedValueOnce(imagePath).mockResolvedValueOnce(pdfPath);

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
    const renderer = new NotionPageRenderer(client as never, page as never, imageSavePath, createLogger() as never);

    const rendered = await renderer.render(buildProcessor(Promise.resolve([])));

    expect(rendered?.html).toContain('<h1 id="overview">Overview</h1>');
    expect(rendered?.html).toContain('<details');
    expect(rendered?.html).toContain('<summary>Details</summary>');
    expect(rendered?.html).toContain('<p>Nested content</p>');
    expect(rendered?.html).toContain('<li>List item</li>');
    expect(rendered?.html).toContain('__ASTRO_IMAGE_');
    expect(rendered?.html).toContain(`href="${pdfPath}"`);
    expect(rendered?.metadata.headings).toEqual([{ depth: 0, text: 'Overview', slug: 'overview' }]);
    expect(rendered?.metadata.imagePaths).toEqual([imagePath, pdfPath]);
    expect(imageApi.saveImageFromAWS).toHaveBeenNthCalledWith(1, hostedImageUrl, imageSavePath, expect.any(Object));
    expect(imageApi.saveImageFromAWS).toHaveBeenNthCalledWith(2, hostedPdfUrl, imageSavePath, expect.any(Object));
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
    imageApi.saveImageFromAWS
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
    expect(imageApi.saveImageFromAWS).toHaveBeenNthCalledWith(1, coverUrl, imageSavePath, expect.any(Object));
    expect(imageApi.saveImageFromAWS).toHaveBeenNthCalledWith(2, iconUrl, imageSavePath, expect.any(Object));
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
    expect(imageApi.saveImageFromAWS).not.toHaveBeenCalled();
  });
});
