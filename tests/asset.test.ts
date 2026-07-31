/**
 * Verifies hosted asset downloads, caching, path handling, and failure boundaries.
 */

import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveNotionAsset, VIRTUAL_CONTENT_ROOT } from '../src/asset.js';

const SIGNED_ASSET_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent-id/object-id/image.png?X-Amz-Signature=sensitive';
const SIGNED_DOCUMENT_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent-id/document-id/guide.pdf?X-Amz-Signature=sensitive';

let originalCwd: string;
let projectRoot: string;
let assetSavePath: string;
let savedAssetPath: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  projectRoot = await mkdtemp(path.join(tmpdir(), 'notion-asset-'));
  projectRoot = await realpath(projectRoot);
  assetSavePath = path.join(projectRoot, 'src', 'assets', 'notion');
  savedAssetPath = path.join(assetSavePath, 'parent-id', 'object-id.png');
  await mkdir(assetSavePath, { recursive: true });
  process.chdir(projectRoot);
});

afterEach(async () => {
  process.chdir(originalCwd);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await rm(projectRoot, { recursive: true, force: true });
});

describe('saveNotionAsset', () => {
  it('downloads an asset and returns its path relative to the virtual content root', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('downloaded-asset')));
    const tags: string[] = [];
    vi.stubGlobal('fetch', fetchMock);

    const assetPath = await saveNotionAsset(SIGNED_ASSET_URL, assetSavePath, {
      tag: (tag) => tags.push(tag),
    });

    expect(await readFile(savedAssetPath, 'utf8')).toBe('downloaded-asset');
    expect(assetPath).toBe(path.relative(path.join(projectRoot, VIRTUAL_CONTENT_ROOT), savedAssetPath));
    expect(fetchMock).toHaveBeenCalledWith(SIGNED_ASSET_URL);
    expect(tags).toEqual(['download']);
  });

  it('preserves the path layout for a non-image asset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('document'))));
    const publicPath = path.join(projectRoot, 'public', 'notion-assets');
    const savedDocumentPath = path.join(publicPath, 'parent-id', 'document-id.pdf');
    await mkdir(publicPath, { recursive: true });

    const assetPath = await saveNotionAsset(SIGNED_DOCUMENT_URL, publicPath, { relativeTo: publicPath });

    expect(await readFile(savedDocumentPath, 'utf8')).toBe('document');
    expect(assetPath).toBe(path.join('parent-id', 'document-id.pdf'));
  });

  it('uses a cached asset without fetching or replacing it', async () => {
    await mkdir(path.dirname(savedAssetPath), { recursive: true });
    await writeFile(savedAssetPath, 'cached-asset');
    const fetchMock = vi.fn();
    const tags: string[] = [];
    vi.stubGlobal('fetch', fetchMock);

    const assetPath = await saveNotionAsset(SIGNED_ASSET_URL, assetSavePath, {
      tag: (tag) => tags.push(tag),
    });

    expect(await readFile(savedAssetPath, 'utf8')).toBe('cached-asset');
    expect(assetPath).toBe(path.relative(path.join(projectRoot, VIRTUAL_CONTENT_ROOT), savedAssetPath));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tags).toEqual(['cached']);
  });

  it('refreshes a cached asset when cache use is disabled', async () => {
    await mkdir(path.dirname(savedAssetPath), { recursive: true });
    await writeFile(savedAssetPath, 'cached-asset');
    const fetchMock = vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('refreshed-asset')));
    const tags: string[] = [];
    vi.stubGlobal('fetch', fetchMock);

    await saveNotionAsset(SIGNED_ASSET_URL, assetSavePath, {
      ignoreCache: true,
      tag: (tag) => tags.push(tag),
    });

    expect(await readFile(savedAssetPath, 'utf8')).toBe('refreshed-asset');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(tags).toEqual(['download']);
  });

  it('rejects a missing destination directory before fetching', async () => {
    const missingDirectory = path.join(projectRoot, 'src', 'missing');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveNotionAsset(SIGNED_ASSET_URL, missingDirectory)).rejects.toThrow(
      `Directory ${missingDirectory} does not exist`
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['not a URL', 'https://example.com/image.png'])('rejects malformed asset URL %s', async (url) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveNotionAsset(url, assetSavePath)).rejects.toThrow('Invalid URL');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(access(savedAssetPath)).rejects.toThrow();
  });

  it('rejects unsuccessful responses before consuming or replacing cached content', async () => {
    await mkdir(path.dirname(savedAssetPath), { recursive: true });
    await writeFile(savedAssetPath, 'cached-asset');
    const arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('error-response').buffer);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      arrayBuffer,
    });
    vi.stubGlobal('fetch', fetchMock);

    let caughtError: unknown;
    try {
      await saveNotionAsset(SIGNED_ASSET_URL, assetSavePath, { ignoreCache: true });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    if (!(caughtError instanceof Error)) return;

    expect(caughtError.message).toMatch(/download.*403/i);
    expect(caughtError.message).not.toContain(SIGNED_ASSET_URL);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(await readFile(savedAssetPath, 'utf8')).toBe('cached-asset');
  });

  it('remains pending until the downloaded asset has been written', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('downloaded-asset')));
    let signalWriteStarted!: () => void;
    let finishWrite!: () => void;
    const writeStarted = new Promise<void>((resolve) => {
      signalWriteStarted = resolve;
    });
    const writePending = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(fse, 'writeFile').mockImplementation(async () => {
      signalWriteStarted();
      await writePending;
    });

    let settled = false;
    const savePromise = saveNotionAsset(SIGNED_ASSET_URL, assetSavePath).finally(() => {
      settled = true;
    });
    await writeStarted;

    expect(settled).toBe(false);
    finishWrite();
    await expect(savePromise).resolves.toBe(
      path.relative(path.join(projectRoot, VIRTUAL_CONTENT_ROOT), savedAssetPath)
    );
  });

  it('propagates write failures without reporting a completed download', async () => {
    const writeError = new Error('disk full');
    const log = vi.fn();
    const tag = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('downloaded-asset'))));
    vi.spyOn(fse, 'writeFile').mockRejectedValue(writeError);

    await expect(saveNotionAsset(SIGNED_ASSET_URL, assetSavePath, { log, tag })).rejects.toBe(writeError);
    expect(log).not.toHaveBeenCalled();
    expect(tag).not.toHaveBeenCalled();
  });
});
