/**
 * Verifies hosted image downloads, caching, path handling, and failure boundaries.
 */

import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import fse from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveImageFromAWS, VIRTUAL_CONTENT_ROOT } from '../src/image.js';

const SIGNED_IMAGE_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent-id/object-id/image.png?X-Amz-Signature=sensitive';

let originalCwd: string;
let projectRoot: string;
let imageSavePath: string;
let savedImagePath: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  projectRoot = await mkdtemp(path.join(tmpdir(), 'notion-image-'));
  projectRoot = await realpath(projectRoot);
  imageSavePath = path.join(projectRoot, 'src', 'assets', 'images', 'notion');
  savedImagePath = path.join(imageSavePath, 'parent-id', 'object-id.png');
  await mkdir(imageSavePath, { recursive: true });
  process.chdir(projectRoot);
});

afterEach(async () => {
  process.chdir(originalCwd);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await rm(projectRoot, { recursive: true, force: true });
});

describe('saveImageFromAWS', () => {
  it('downloads an image and returns its path relative to the virtual content root', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('downloaded-image')));
    const tags: string[] = [];
    vi.stubGlobal('fetch', fetchMock);

    const imagePath = await saveImageFromAWS(SIGNED_IMAGE_URL, imageSavePath, {
      tag: (tag) => tags.push(tag),
    });

    expect(await readFile(savedImagePath, 'utf8')).toBe('downloaded-image');
    expect(imagePath).toBe(path.relative(path.join(projectRoot, VIRTUAL_CONTENT_ROOT), savedImagePath));
    expect(fetchMock).toHaveBeenCalledWith(SIGNED_IMAGE_URL);
    expect(tags).toEqual(['download']);
  });

  it('uses a cached image without fetching or replacing it', async () => {
    await mkdir(path.dirname(savedImagePath), { recursive: true });
    await writeFile(savedImagePath, 'cached-image');
    const fetchMock = vi.fn();
    const tags: string[] = [];
    vi.stubGlobal('fetch', fetchMock);

    const imagePath = await saveImageFromAWS(SIGNED_IMAGE_URL, imageSavePath, {
      tag: (tag) => tags.push(tag),
    });

    expect(await readFile(savedImagePath, 'utf8')).toBe('cached-image');
    expect(imagePath).toBe(path.relative(path.join(projectRoot, VIRTUAL_CONTENT_ROOT), savedImagePath));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tags).toEqual(['cached']);
  });

  it('refreshes a cached image when cache use is disabled', async () => {
    await mkdir(path.dirname(savedImagePath), { recursive: true });
    await writeFile(savedImagePath, 'cached-image');
    const fetchMock = vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('refreshed-image')));
    const tags: string[] = [];
    vi.stubGlobal('fetch', fetchMock);

    await saveImageFromAWS(SIGNED_IMAGE_URL, imageSavePath, {
      ignoreCache: true,
      tag: (tag) => tags.push(tag),
    });

    expect(await readFile(savedImagePath, 'utf8')).toBe('refreshed-image');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(tags).toEqual(['download']);
  });

  it('rejects a missing destination directory before fetching', async () => {
    const missingDirectory = path.join(projectRoot, 'src', 'missing');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveImageFromAWS(SIGNED_IMAGE_URL, missingDirectory)).rejects.toThrow(
      `Directory ${missingDirectory} does not exist`
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['not a URL', 'https://example.com/image.png'])('rejects malformed image URL %s', async (url) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(saveImageFromAWS(url, imageSavePath)).rejects.toThrow('Invalid URL');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(access(savedImagePath)).rejects.toThrow();
  });

  it('rejects unsuccessful responses before consuming or replacing cached content', async () => {
    await mkdir(path.dirname(savedImagePath), { recursive: true });
    await writeFile(savedImagePath, 'cached-image');
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
      await saveImageFromAWS(SIGNED_IMAGE_URL, imageSavePath, { ignoreCache: true });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    if (!(caughtError instanceof Error)) return;

    expect(caughtError.message).toMatch(/download.*403/i);
    expect(caughtError.message).not.toContain(SIGNED_IMAGE_URL);
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(await readFile(savedImagePath, 'utf8')).toBe('cached-image');
  });

  it('remains pending until the downloaded image has been written', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('downloaded-image')));
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
    const savePromise = saveImageFromAWS(SIGNED_IMAGE_URL, imageSavePath).finally(() => {
      settled = true;
    });
    await writeStarted;

    expect(settled).toBe(false);
    finishWrite();
    await expect(savePromise).resolves.toBe(
      path.relative(path.join(projectRoot, VIRTUAL_CONTENT_ROOT), savedImagePath)
    );
  });

  it('propagates write failures without reporting a completed download', async () => {
    const writeError = new Error('disk full');
    const log = vi.fn();
    const tag = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new TextEncoder().encode('downloaded-image'))));
    vi.spyOn(fse, 'writeFile').mockRejectedValue(writeError);

    await expect(saveImageFromAWS(SIGNED_IMAGE_URL, imageSavePath, { log, tag })).rejects.toBe(writeError);
    expect(log).not.toHaveBeenCalled();
    expect(tag).not.toHaveBeenCalled();
  });
});
