/**
 * Verifies live-test configuration failures without contacting Notion.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { VIRTUAL_CONTENT_ROOT } from '../src/asset.js';
import { getHostedAssetExpectation } from './live/asset-contract.js';
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

describe('getHostedAssetExpectation', () => {
  const hostedUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/parent-id/object-id/asset.pdf';
  const imageSavePath = path.resolve('/tmp/source-images');
  const publicAssetPath = path.resolve('/tmp/public-assets');
  const publicAssetUrlPath = '/notion-assets';

  it('routes hosted images to source metadata', () => {
    const expectation = getHostedAssetExpectation(
      { blockId: 'image-id', blockType: 'image', url: hostedUrl },
      imageSavePath,
      publicAssetPath,
      publicAssetUrlPath
    );

    const downloadedPath = path.join(imageSavePath, 'parent-id', 'object-id.pdf');
    expect(expectation).toEqual({
      destination: 'source',
      downloadedPath,
      renderedPath: path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), downloadedPath),
    });
  });

  it.each(['audio', 'file', 'pdf', 'video'])('routes hosted %s blocks to public paths and URLs', (blockType) => {
    const expectation = getHostedAssetExpectation(
      { blockId: `${blockType}-id`, blockType, url: hostedUrl },
      imageSavePath,
      publicAssetPath,
      publicAssetUrlPath
    );

    expect(expectation).toEqual({
      destination: 'public',
      downloadedPath: path.join(publicAssetPath, 'parent-id', 'object-id.pdf'),
      renderedPath: '/notion-assets/parent-id/object-id.pdf',
    });
  });

  it('rejects hosted assets without a supported destination', () => {
    expect(() =>
      getHostedAssetExpectation(
        { blockId: 'unsupported-id', blockType: 'bookmark', url: hostedUrl },
        imageSavePath,
        publicAssetPath,
        publicAssetUrlPath
      )
    ).toThrow('Hosted bookmark block unsupported-id has no supported asset destination');
  });
});

describe('writeLivePreview', () => {
  it('writes browser-readable HTML with copied source images and public assets', async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'notion-preview-test-'));
    const imageSavePath = path.join(temporaryRoot, 'source-images');
    const publicAssetPath = path.join(temporaryRoot, 'public-assets');
    const sourcePath = path.join(imageSavePath, 'image-parent', 'image.png');
    const documentPath = path.join(publicAssetPath, 'document-parent', 'document.pdf');
    const videoPath = path.join(publicAssetPath, 'video-parent', 'video.mp4');
    const audioPath = path.join(publicAssetPath, 'audio-parent', 'audio.mp3');
    const outputDirectory = path.join(temporaryRoot, 'output');
    const renderedPath = path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), sourcePath);
    const astroImageMetadata = JSON.stringify({ src: renderedPath, index: 0 }).replaceAll('"', '&#x22;');
    const renderedHtml = [
      `<img __ASTRO_IMAGE_="${astroImageMetadata}">`,
      '<a href="/notion-assets/document-parent/document.pdf">Document</a>',
      '<video src="/notion-assets/video-parent/video.mp4"></video>',
      '<audio src="/notion-assets/audio-parent/audio.mp3"></audio>',
    ].join('');

    try {
      await mkdir(path.dirname(sourcePath), { recursive: true });
      await mkdir(path.dirname(documentPath), { recursive: true });
      await mkdir(path.dirname(videoPath), { recursive: true });
      await mkdir(path.dirname(audioPath), { recursive: true });
      await writeFile(sourcePath, 'image-content');
      await writeFile(documentPath, 'document-content');
      await writeFile(videoPath, 'video-content');
      await writeFile(audioPath, 'audio-content');

      const preview = await writeLivePreview(renderedHtml, [renderedPath], imageSavePath, outputDirectory, {
        publicAssetPath,
        publicAssetUrlPath: '/notion-assets',
        publicAssets: [
          { sourcePath: documentPath, renderedPath: '/notion-assets/document-parent/document.pdf' },
          { sourcePath: videoPath, renderedPath: '/notion-assets/video-parent/video.mp4' },
          { sourcePath: audioPath, renderedPath: '/notion-assets/audio-parent/audio.mp3' },
        ],
      });
      const previewHtml = await readFile(preview.htmlPath, 'utf8');

      expect(preview.assetCount).toBe(4);
      expect(previewHtml).toContain('src="./assets/image-parent/image.png"');
      expect(previewHtml).toContain('href="./assets/document-parent/document.pdf"');
      expect(previewHtml).toContain('src="./assets/video-parent/video.mp4"');
      expect(previewHtml).toContain('src="./assets/audio-parent/audio.mp3"');
      expect(previewHtml).not.toContain('__ASTRO_IMAGE_');
      expect(previewHtml).not.toContain(renderedPath);
      expect(previewHtml).not.toContain('/notion-assets/');
      await expect(readFile(path.join(outputDirectory, 'assets', 'image-parent', 'image.png'), 'utf8')).resolves.toBe(
        'image-content'
      );
      await expect(
        readFile(path.join(outputDirectory, 'assets', 'document-parent', 'document.pdf'), 'utf8')
      ).resolves.toBe('document-content');
      await expect(readFile(path.join(outputDirectory, 'assets', 'video-parent', 'video.mp4'), 'utf8')).resolves.toBe(
        'video-content'
      );
      await expect(readFile(path.join(outputDirectory, 'assets', 'audio-parent', 'audio.mp3'), 'utf8')).resolves.toBe(
        'audio-content'
      );
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('rejects source image paths outside the configured image root', async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'notion-preview-test-'));
    const imageSavePath = path.join(temporaryRoot, 'source-images');
    const outsidePath = path.join(temporaryRoot, 'outside.png');
    const renderedPath = path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), outsidePath);

    try {
      await expect(
        writeLivePreview('', [renderedPath], imageSavePath, path.join(temporaryRoot, 'output'), {
          publicAssetPath: path.join(temporaryRoot, 'public-assets'),
          publicAssetUrlPath: '/notion-assets',
          publicAssets: [],
        })
      ).rejects.toThrow('Downloaded preview asset is outside the image directory');
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('rejects public asset mappings outside the configured path and URL roots', async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'notion-preview-test-'));
    const publicAssetPath = path.join(temporaryRoot, 'public-assets');
    const outputDirectory = path.join(temporaryRoot, 'output');

    try {
      await expect(
        writeLivePreview('', [], path.join(temporaryRoot, 'source-images'), outputDirectory, {
          publicAssetPath,
          publicAssetUrlPath: '/notion-assets',
          publicAssets: [
            {
              sourcePath: path.join(temporaryRoot, 'outside.pdf'),
              renderedPath: '/notion-assets/outside.pdf',
            },
          ],
        })
      ).rejects.toThrow('Downloaded preview asset is outside the public asset directory');

      await expect(
        writeLivePreview('', [], path.join(temporaryRoot, 'source-images'), outputDirectory, {
          publicAssetPath,
          publicAssetUrlPath: '/notion-assets',
          publicAssets: [
            {
              sourcePath: path.join(publicAssetPath, 'document.pdf'),
              renderedPath: '/other-assets/document.pdf',
            },
          ],
        })
      ).rejects.toThrow('Rendered preview asset is outside the public asset URL path');
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
