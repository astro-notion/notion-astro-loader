/**
 * Models expected destinations for hosted assets in live verification.
 */

import path from 'node:path';

import { VIRTUAL_CONTENT_ROOT } from '../../src/asset.js';

/** Identifies one hosted block asset without exposing its URL in diagnostics. */
export interface HostedAsset {
  blockId: string;
  blockType: string;
  url: string;
}

/** Expected local and rendered locations for a hosted asset. */
export interface HostedAssetExpectation {
  destination: 'source' | 'public';
  downloadedPath: string;
  renderedPath: string;
}

/**
 * Resolves the expected destination and rendered reference for a hosted asset.
 */
export function getHostedAssetExpectation(
  asset: HostedAsset,
  imageSavePath: string,
  publicAssetPath: string,
  publicAssetUrlPath: string
): HostedAssetExpectation {
  const [parentId, objectId, fileName] = new URL(asset.url).pathname.split('/').filter(Boolean);
  const extension = fileName?.split('.').at(-1);

  if (!parentId || !objectId || !extension) {
    throw new Error(`Hosted ${asset.blockType} block ${asset.blockId} has an invalid asset path`);
  }

  const relativeAssetPath = path.join(parentId, `${objectId}.${extension}`);
  if (asset.blockType === 'image') {
    const downloadedPath = path.resolve(imageSavePath, relativeAssetPath);
    return {
      destination: 'source',
      downloadedPath,
      renderedPath: path.relative(path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT), downloadedPath),
    };
  }

  const isPublicAsset = ['audio', 'file', 'pdf', 'video'].includes(asset.blockType);
  if (!isPublicAsset) {
    throw new Error(`Hosted ${asset.blockType} block ${asset.blockId} has no supported asset destination`);
  }

  return {
    destination: 'public',
    downloadedPath: path.resolve(publicAssetPath, relativeAssetPath),
    renderedPath: path.posix.join(publicAssetUrlPath, relativeAssetPath.split(path.sep).join('/')),
  };
}
