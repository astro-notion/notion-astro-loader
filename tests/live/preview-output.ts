/**
 * Writes a local browser preview of live Notion HTML and downloaded assets.
 */

import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { VIRTUAL_CONTENT_ROOT } from '../../src/asset.js';

/** Result paths and counts produced by local live-preview generation. */
export interface LivePreviewResult {
  htmlPath: string;
  assetCount: number;
}

/** Maps one downloaded public asset to its rendered URL. */
export interface LivePreviewPublicAsset {
  sourcePath: string;
  renderedPath: string;
}

/** Public asset configuration used to build a browser-readable preview. */
export interface LivePreviewPublicAssets {
  publicAssetPath: string;
  publicAssetUrlPath: string;
  publicAssets: LivePreviewPublicAsset[];
}

/** Decodes the HTML entities used inside serialized Astro image metadata. */
function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll('&#x22;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&#x26;', '&')
    .replaceAll('&#38;', '&')
    .replaceAll('&amp;', '&');
}

/** Escapes a string for a double-quoted HTML attribute. */
function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

/** Restores browser-readable `src` attributes from Astro-only image metadata. */
function restoreAstroImageSources(html: string): string {
  return html.replace(/__ASTRO_IMAGE_="([^"]*)"/g, (_attribute, encodedMetadata: string) => {
    const metadata = JSON.parse(decodeHtmlAttribute(encodedMetadata)) as { src?: unknown };
    if (typeof metadata.src !== 'string') {
      throw new Error('Astro image metadata is missing a source path');
    }
    return `src="${escapeHtmlAttribute(metadata.src)}"`;
  });
}

/** Wraps the rendered fragment in a minimal standalone HTML document. */
function createPreviewDocument(renderedHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Notion Renderer Preview</title>
    <style>
      body { max-width: 72rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.5; }
      img, video { max-width: 100%; height: auto; }
      audio { width: 100%; }
      pre { overflow: auto; }
    </style>
  </head>
  <body>
${renderedHtml}
  </body>
</html>
`;
}

/** Returns an asset path relative to its configured root without permitting traversal. */
function getRelativeAssetPath(sourcePath: string, rootPath: string, rootName: string): string {
  const relativePath = path.relative(rootPath, sourcePath);
  const escapesRoot = relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${path.sep}`);

  if (escapesRoot || path.isAbsolute(relativePath)) {
    throw new Error(`Downloaded preview asset is outside the ${rootName}`);
  }

  return relativePath;
}

/**
 * Copies downloaded assets and writes standalone browser-readable live HTML.
 */
export async function writeLivePreview(
  renderedHtml: string,
  renderedAssetPaths: string[],
  imageSavePath: string,
  outputDirectory: string,
  publicAssetConfig: LivePreviewPublicAssets
): Promise<LivePreviewResult> {
  const virtualContentPath = path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT);
  const assetMappings = new Map<string, { sourcePath: string; previewPath: string; relativePath: string }>();

  for (const renderedAssetPath of renderedAssetPaths) {
    const sourcePath = path.resolve(virtualContentPath, renderedAssetPath);
    const relativePath = getRelativeAssetPath(sourcePath, imageSavePath, 'image directory');

    const portableRelativePath = relativePath.split(path.sep).join('/');
    assetMappings.set(renderedAssetPath, {
      sourcePath,
      relativePath,
      previewPath: `./assets/${portableRelativePath}`,
    });
  }

  const normalizedPublicUrlPath = path.posix.resolve('/', publicAssetConfig.publicAssetUrlPath);
  for (const publicAsset of publicAssetConfig.publicAssets) {
    const sourcePath = path.resolve(publicAsset.sourcePath);
    const relativePath = getRelativeAssetPath(sourcePath, publicAssetConfig.publicAssetPath, 'public asset directory');
    const normalizedRenderedPath = path.posix.resolve('/', publicAsset.renderedPath);
    const relativeUrlPath = path.posix.relative(normalizedPublicUrlPath, normalizedRenderedPath);
    const escapesPublicUrlPath =
      relativeUrlPath === '' || relativeUrlPath === '..' || relativeUrlPath.startsWith('../');

    if (escapesPublicUrlPath || path.posix.isAbsolute(relativeUrlPath)) {
      throw new Error('Rendered preview asset is outside the public asset URL path');
    }

    const portableRelativePath = relativePath.split(path.sep).join('/');
    assetMappings.set(publicAsset.renderedPath, {
      sourcePath,
      relativePath,
      previewPath: `./assets/${portableRelativePath}`,
    });
  }

  await rm(outputDirectory, { recursive: true, force: true });

  let previewHtml = renderedHtml;
  for (const [renderedAssetPath, asset] of assetMappings) {
    const destinationPath = path.join(outputDirectory, 'assets', asset.relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await copyFile(asset.sourcePath, destinationPath);
    previewHtml = previewHtml.replaceAll(renderedAssetPath, asset.previewPath);
    previewHtml = previewHtml.replaceAll(renderedAssetPath.replaceAll('\\', '/'), asset.previewPath);
  }

  const htmlPath = path.join(outputDirectory, 'index.html');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(htmlPath, createPreviewDocument(restoreAstroImageSources(previewHtml)));

  return { htmlPath, assetCount: assetMappings.size };
}
