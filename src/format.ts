import type { GetImageResult } from 'astro';
import type { FileObject } from './types.js';

/**
 * Extract a plain string from a list of rich text items.
 *
 * @see https://developers.notion.com/reference/rich-text
 *
 * @example
 * richTextToPlainText(page.properties.Name.title)
 */
export function richTextToPlainText(data: ReadonlyArray<{ plain_text: string }>): string {
  return data.map((text) => text.plain_text).join('');
}

/**
 * Extract the URL from a file property.
 *
 * @see https://developers.notion.com/reference/file-object
 */
export function fileToUrl(file: FileObject): string;
export function fileToUrl(file: FileObject | null): string | undefined;
export function fileToUrl(file: FileObject | null): string | undefined {
  switch (file?.type) {
    case 'external':
      return file.external.url;
    case 'file':
      return file.file.url;
    default:
      return undefined;
  }
}

/**
 * Convert a Notion file object to an Astro image asset in a server-side Astro context.
 * `getImage()` is server-only in Astro 6, so this helper must stay in build, loader,
 * or other server execution paths.
 *
 * @see https://developers.notion.com/reference/file-object
 */
export async function fileToImageAsset(file: FileObject): Promise<GetImageResult> {
  const { getImage } = await import('astro:assets');
  const src = file.type === 'external' ? file.external.url : file.file.url;

  return getImage({
    src,
    inferSize: true,
  });
}

/**
 * Replace date strings with date objects.
 *
 * @see https://developers.notion.com/reference/page-property-values#date
 */
export function dateToDateObjects(
  dateResponse: {
    start: string;
    end: string | null;
    time_zone: string | null;
  } | null
) {
  if (dateResponse === null) {
    return null;
  }

  return {
    start: new Date(dateResponse.start),
    end: dateResponse.end ? new Date(dateResponse.end) : null,
    time_zone: dateResponse.time_zone,
  };
}
