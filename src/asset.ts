/** Downloads Notion-hosted assets and resolves their source-relative paths. */

import fse from 'fs-extra';
import path from 'node:path';

import { dim } from 'kleur/colors';

/** Options for saving a Notion-hosted asset. */
export interface SaveAssetOptions {
  ignoreCache?: boolean;
  log?: (message: string) => void;
  relativeTo?: string;
  tag?: (type: 'download' | 'cached') => void;
}

/** Virtual directory used for rendered Notion content entries. */
export const VIRTUAL_CONTENT_ROOT = 'src/content/notion';

/**
 * Downloads a Notion-hosted asset to a local directory.
 *
 * @param url Signed URL for the Notion-hosted asset.
 * @param destination Directory where the asset will be saved.
 * @param options Cache, diagnostics, and returned-path configuration.
 * @returns The saved path relative to the configured base or virtual content root.
 * @throws {Error} If the destination is missing, the URL is malformed, or the response is unsuccessful.
 */
export async function saveNotionAsset(url: string, destination: string, options: SaveAssetOptions = {}) {
  const { ignoreCache, log, relativeTo, tag } = options;

  if (!fse.existsSync(destination)) {
    throw new Error(`Directory ${destination} does not exist`);
  }

  const [parentId, objectId, fileName] = new URL(url).pathname.split('/').filter(Boolean);
  if (!fileName || !parentId || !objectId) {
    throw new Error('Invalid URL');
  }

  const saveDirectory = path.resolve(destination, parentId);
  fse.ensureDirSync(saveDirectory);

  const extension = fileName.split('.').at(-1);
  const filePath = path.resolve(saveDirectory, `${objectId}.${extension}`);

  if (ignoreCache || !fse.existsSync(filePath)) {
    const response = await fetch(url);
    if (!response.ok) {
      const status = [response.status, response.statusText].filter(Boolean).join(' ');
      throw new Error(`Failed to download asset: HTTP ${status}`);
    }

    const buffer = await response.arrayBuffer();
    await fse.writeFile(filePath, new Uint8Array(buffer));

    log?.(`Saved asset \`${fileName}\` ${dim(`created \`${filePath}\``)}`);
    tag?.('download');
  } else {
    log?.(`Skipped caching asset \`${fileName}\` ${dim(`cached at \`${filePath}\``)}`);
    tag?.('cached');
  }

  const relativeBase = relativeTo ?? path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT);
  return path.relative(relativeBase, filePath);
}

/**
 * Resolves a virtual content asset path relative to the project's source directory.
 *
 * @param rawPath Asset path relative to the virtual content root.
 * @returns The asset path relative to `src`.
 */
export function resolveSourceAssetPath(rawPath: string): string {
  const absolutePath = path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT, rawPath);
  return path.relative(path.resolve(process.cwd(), 'src'), absolutePath);
}
