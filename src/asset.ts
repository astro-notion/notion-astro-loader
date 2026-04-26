import fse from 'fs-extra';
import path from 'node:path';

import { dim } from 'kleur/colors';

export interface SaveOptions {
  ignoreCache?: boolean;
  log?: (message: string) => void;
  tag?: (type: 'download' | 'cached') => void;
}

export const VIRTUAL_CONTENT_ROOT = 'src/content/notion';

/**
 * Downloads and saves an file from an AWS URL to a local directory.
 *
 * @param url The AWS URL of the file to download.
 * @param assetPath The directory path where the file will be saved.
 * @param options Optional configuration for saving the file.
 * @param options.ignoreCache Whether to ignore cached files and download again. Defaults to false.
 * @param options.log Optional logging function to record the operation.
 * @param options.tag Optional tagging function to mark the operation as 'download' or 'cached'.
 *
 * @returns The relative path of the saved image from the project's virtual content root.
 *
 * @throws {Error} If the provided `url` is invalid.
 *
 * @example
 * For the following AWS URL:
 * https://prod-files-secure.s3.us-west-2.amazonaws.com/ed3b245b-dd96-4e0d-a399-9a99a0cf37c0/d16195b7-f998-4b7c-8d2e-38b9c47be295/image.png?...
 *
 * The function parses the URL into:
 * - Parent ID: ed3b245b-dd96-4e0d-a399-9a99a0cf37c0
 * - Object ID: d16195b7-f998-4b7c-8d2e-38b9c47be295
 * - File Name: image.png
 *
 * And saves it to:
 * ./src/{dir}/d16195b7-f998-4b7c-8d2e-38b9c47be295/image.png
 */
export async function downloadFile(url: string, assetPath: string, options: SaveOptions = {}) {
  const { ignoreCache, log, tag } = options;

  if (!fse.existsSync(assetPath)) {
    throw new Error(`Directory ${assetPath} does not exist`);
  }

  // Validate and parse the URL
  const [parentId, objId, fileName] = new URL(url).pathname // Remove hostname and query params
    .split('/') // Get URL segments
    .filter(Boolean); // Remove empty strings

  if (!fileName || !parentId || !objId) {
    throw new Error('Invalid URL');
  }

  // Path to parent directory of the image
  // ./src/{dir}/{objId}
  const saveDirPath = path.resolve(assetPath, objId);
  fse.ensureDirSync(saveDirPath);

  // Path to the file
  // ./src/{dir}/{objId}/{fileName}
  const filePath = path.resolve(saveDirPath, fileName);

  if (ignoreCache || !fse.existsSync(filePath)) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    fse.writeFile(filePath, new Uint8Array(buffer));

    log?.(`Downloaded file \`${fileName}\` ${dim(`created \`${filePath}\``)}`);
    tag?.('download');
  } else {
    log?.(`Skipped downloading file \`${fileName}\` ${dim(`cached at \`${filePath}\``)}`);
    tag?.('cached');
  }

  const relBasePath = path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT);

  // Relative path of the image from the virtual content root
  return path.relative(relBasePath, filePath);
}

/**
 * Transforms a raw image path into a relative path from the 'src' directory.
 */
export function resolveAssetPath(rawPath: string): string {
  // get abs path from relative path to VIRTUAL_CONTENT_ROOT
  const absPath = path.resolve(process.cwd(), VIRTUAL_CONTENT_ROOT, rawPath);
  return path.relative(process.cwd(), absPath);
}
