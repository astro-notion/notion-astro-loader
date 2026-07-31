/**
 * Verifies live-test configuration failures without contacting Notion.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { VIRTUAL_CONTENT_ROOT } from '../src/asset.js';
import { getLiveTestConfig } from './live/config.js';
import { normalizeLiveSnapshot } from './live/normalize.js';
import { writeLivePreview } from './live/preview-output.js';

describe('getLiveTestConfig', () => {
  it('reports every missing variable without exposing configured secret values', () => {
    const configuredToken = 'secret-token-value';

    expect(() => getLiveTestConfig({ NOTION_TEST_TOKEN: configuredToken })).toThrowError(
      'Missing live Notion test configuration: NOTION_TEST_DATA_SOURCE_ID'
    );

    try {
      getLiveTestConfig({ NOTION_TEST_TOKEN: configuredToken });
    } catch (error) {
      expect(String(error)).not.toContain(configuredToken);
    }
  });

  it('returns both configured values', () => {
    expect(
      getLiveTestConfig({
        NOTION_TEST_TOKEN: 'test-token',
        NOTION_TEST_DATA_SOURCE_ID: 'data-source-id',
      })
    ).toEqual({ token: 'test-token', dataSourceId: 'data-source-id' });
  });
});

describe('normalizeLiveSnapshot', () => {
  it('normalizes signed URLs, temporary roots, timestamps, and path separators', () => {
    const signedUrl =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent/object/file.png?X-Amz-Signature=sensitive';
    const html = [
      `<img src="${signedUrl}">`,
      '<a href="C:\\Temp\\notion-live\\asset.pdf">Asset</a>',
      '<time>2026-04-25T11:30:00.000Z</time>',
    ].join('\r\n');

    const normalized = normalizeLiveSnapshot(html, {
      temporaryPaths: ['C:\\Temp\\notion-live'],
    });

    expect(normalized).toContain('[NOTION_SIGNED_URL]');
    expect(normalized).toContain('[TEMP_ROOT]/asset.pdf');
    expect(normalized).toContain('[TIMESTAMP]');
    expect(normalized).not.toContain('X-Amz-Signature');
    expect(normalized).not.toContain('C:\\Temp');
    expect(normalized).not.toContain('\r');
  });

  it('rejects forbidden values without including them in the error', () => {
    const secret = 'secret-notion-token';

    expect(() => normalizeLiveSnapshot(`<p>${secret}</p>`, { forbiddenValues: [secret] })).toThrow(
      'Live snapshot contains a forbidden sensitive value'
    );

    try {
      normalizeLiveSnapshot(`<p>${secret}</p>`, { forbiddenValues: [secret] });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});

describe('writeLivePreview', () => {
  it('writes browser-readable HTML with copied relative assets', async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'notion-preview-test-'));
    const imageSavePath = path.join(temporaryRoot, 'downloads');
    const sourcePath = path.join(imageSavePath, 'parent', 'image.png');
    const outputDirectory = path.join(temporaryRoot, 'output');
    const renderedPath = path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), sourcePath);
    const astroImageMetadata = JSON.stringify({ src: renderedPath, index: 0 }).replaceAll('"', '&#x22;');
    const renderedHtml = [
      `<img __ASTRO_IMAGE_="${astroImageMetadata}">`,
      `<a href="${renderedPath}">Downloaded asset</a>`,
    ].join('');

    try {
      await mkdir(path.dirname(sourcePath), { recursive: true });
      await writeFile(sourcePath, 'image-content');

      const preview = await writeLivePreview(renderedHtml, [renderedPath], imageSavePath, outputDirectory);
      const previewHtml = await readFile(preview.htmlPath, 'utf8');

      expect(preview.assetCount).toBe(1);
      expect(previewHtml).toContain('src="./assets/parent/image.png"');
      expect(previewHtml).toContain('href="./assets/parent/image.png"');
      expect(previewHtml).not.toContain('__ASTRO_IMAGE_');
      expect(previewHtml).not.toContain(renderedPath);
      await expect(readFile(path.join(outputDirectory, 'assets', 'parent', 'image.png'), 'utf8')).resolves.toBe(
        'image-content'
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
