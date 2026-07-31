/**
 * Runs the separately invoked live Notion golden-page verification.
 */

import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client, isFullBlock, isFullPage, iteratePaginatedAPI, type PageObjectResponse } from '@notionhq/client';
import { expect, it, vi } from 'vitest';

import { buildProcessor, NotionPageRenderer } from '../../src/render.js';
import { VIRTUAL_CONTENT_ROOT } from '../../src/image.js';
import { getLiveTestConfig } from './config.js';
import { normalizeLiveSnapshot } from './normalize.js';
import { writeLivePreview } from './preview-output.js';

const FIXTURE_TITLE = 'Renderer Test';
const FIXTURE_MARKER = 'astro-notion-loader-smoke';
const REQUIRED_HOSTED_BLOCK_TYPES = ['audio', 'file', 'image', 'video'] as const;

/** Identifies one hosted block asset without exposing its URL in diagnostics. */
interface HostedAsset {
  blockId: string;
  blockType: string;
  url: string;
}

/** Creates a quiet Astro logger for live rendering. */
function createLogger() {
  const logger = {
    label: 'notion-live-test',
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    fork: vi.fn(),
  };
  logger.fork.mockReturnValue(logger);
  return logger;
}

/** Returns renderer diagnostics with sensitive values, URLs, and temporary paths removed. */
function getSafeRendererErrors(logger: ReturnType<typeof createLogger>, sensitiveValues: string[]): string {
  let errors = logger.error.mock.calls.flat().map(String).join('; ');

  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue) errors = errors.replaceAll(sensitiveValue, '[REDACTED]');
  }

  return errors.replace(/https?:\/\/\S+/g, '[URL]').replace(/(?:\/private)?\/var\/\S+/g, '[TEMP_ROOT]');
}

/** Returns the dedicated live fixture selected through its `Title` property. */
async function getRendererTestPage(client: Client, dataSourceId: string): Promise<PageObjectResponse> {
  const pages = iteratePaginatedAPI(client.dataSources.query, {
    data_source_id: dataSourceId,
    filter: {
      property: 'Title',
      title: { equals: FIXTURE_TITLE },
    },
  });

  for await (const page of pages) {
    if (!isFullPage(page)) continue;

    const title = page.properties.Title;
    const titleText = title?.type === 'title' ? title.title.map((richText) => richText.plain_text).join('') : '';
    if (titleText === FIXTURE_TITLE) return page;
  }

  throw new Error(`Live Notion fixture not found: expected Title property ${JSON.stringify(FIXTURE_TITLE)}`);
}

/** Returns block and asset shape details for safe live-render failure diagnostics. */
async function getBlockDiagnostics(
  client: Client,
  blockId: string,
  inventory = new Map<string, number>(),
  assets: Array<Record<string, unknown>> = [],
  hostedAssets: HostedAsset[] = []
) {
  const blocks = iteratePaginatedAPI(client.blocks.children.list, { block_id: blockId });

  for await (const block of blocks) {
    if (!isFullBlock(block)) continue;

    inventory.set(block.type, (inventory.get(block.type) ?? 0) + 1);
    if (['audio', 'file', 'image', 'pdf', 'video'].includes(block.type)) {
      const asset = (block as any)[block.type];
      assets.push({
        blockType: block.type,
        assetType: asset?.type,
        hasFileUrl: typeof asset?.file?.url === 'string',
        hasExternalUrl: typeof asset?.external?.url === 'string',
      });
      if (asset?.type === 'file' && typeof asset.file?.url === 'string') {
        hostedAssets.push({ blockId: block.id, blockType: block.type, url: asset.file.url });
      }
    }
    if (block.has_children) await getBlockDiagnostics(client, block.id, inventory, assets, hostedAssets);
  }

  return {
    blockTypes: Object.fromEntries([...inventory].sort(([left], [right]) => left.localeCompare(right))),
    assets,
    hostedAssets,
  };
}

/** Resolves the local path produced for a hosted Notion asset URL. */
function getDownloadedAssetPath(asset: HostedAsset, imageSavePath: string): string {
  const [parentId, objectId, fileName] = new URL(asset.url).pathname.split('/').filter(Boolean);
  const extension = fileName?.split('.').at(-1);

  if (!parentId || !objectId || !extension) {
    throw new Error(`Hosted ${asset.blockType} block ${asset.blockId} has an invalid asset path`);
  }

  return path.resolve(imageSavePath, parentId, `${objectId}.${extension}`);
}

it('selects and renders the dedicated Notion fixture page', async () => {
  const { token, dataSourceId } = getLiveTestConfig();
  const client = new Client({ auth: token });
  const imageSavePath = await mkdtemp(path.join(tmpdir(), 'notion-live-'));

  try {
    const page = await getRendererTestPage(client, dataSourceId);
    const diagnostics = await getBlockDiagnostics(client, page.id);
    const logger = createLogger();
    const renderer = new NotionPageRenderer(client, page, imageSavePath, logger as never);
    const rendered = await renderer.render(buildProcessor(Promise.resolve([])));

    if (!rendered) {
      const safeDiagnostics = { blockTypes: diagnostics.blockTypes, assets: diagnostics.assets };
      throw new Error(
        `The live Notion fixture failed to render: ${getSafeRendererErrors(logger, [token, dataSourceId])}; diagnostics: ${JSON.stringify(safeDiagnostics)}`
      );
    }

    expect(rendered?.html).toContain(FIXTURE_MARKER);
    expect(rendered?.html).toMatch(/<img\b/);
    expect(rendered?.html).toMatch(/<a\b/);
    expect(rendered?.html).toMatch(/<video\b/);
    expect(rendered?.html).toMatch(/<audio\b/);
    const hostedBlockTypes = new Set(diagnostics.hostedAssets.map((asset) => asset.blockType));
    for (const requiredBlockType of REQUIRED_HOSTED_BLOCK_TYPES) {
      expect(hostedBlockTypes.has(requiredBlockType), `Missing hosted ${requiredBlockType} fixture block`).toBe(true);
    }

    for (const asset of diagnostics.hostedAssets) {
      const downloadedPath = getDownloadedAssetPath(asset, imageSavePath);
      const renderedPath = path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), downloadedPath);

      await expect(
        access(downloadedPath),
        `${asset.blockType} block ${asset.blockId} was not downloaded`
      ).resolves.toBeUndefined();
      expect(
        rendered.metadata.imagePaths,
        `${asset.blockType} block ${asset.blockId} is missing from metadata`
      ).toContain(renderedPath);
      expect(rendered.html, `${asset.blockType} block ${asset.blockId} is missing from rendered HTML`).toContain(
        renderedPath
      );
    }

    const previewDirectory = process.env.NOTION_LIVE_PREVIEW_DIR;
    if (previewDirectory) {
      await writeLivePreview(rendered.html, rendered.metadata.imagePaths, imageSavePath, previewDirectory);
    }

    const relativeTemporaryPath = path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), imageSavePath);
    const normalizedHtml = normalizeLiveSnapshot(rendered!.html, {
      temporaryPaths: [imageSavePath, relativeTemporaryPath],
      forbiddenValues: [token, dataSourceId],
    });
    const snapshotPath = fileURLToPath(new URL('./renderer-test.snapshot.html', import.meta.url));

    await expect(normalizedHtml).toMatchFileSnapshot(snapshotPath);
  } finally {
    await rm(imageSavePath, { recursive: true, force: true });
  }
}, 120_000);
