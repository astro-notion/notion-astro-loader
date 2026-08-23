/**
 * Normalizes known volatile live-render values before snapshot comparison.
 */

/** Options controlling live snapshot normalization and secret rejection. */
export interface NormalizeLiveSnapshotOptions {
  temporaryPaths?: string[];
  forbiddenValues?: string[];
}

const SIGNED_URL_PATTERN = /https:\/\/[^\s"'<>]*(?:X-Amz-Signature|Signature|AWSAccessKeyId)[^\s"'<>]*/gi;
const ISO_TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g;

/** Escapes a literal value for use in a regular expression. */
function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Produces deterministic live HTML while refusing to serialize configured secrets.
 */
export function normalizeLiveSnapshot(html: string, options: NormalizeLiveSnapshotOptions = {}): string {
  for (const forbiddenValue of options.forbiddenValues ?? []) {
    if (forbiddenValue && html.includes(forbiddenValue)) {
      throw new Error('Live snapshot contains a forbidden sensitive value');
    }
  }

  let normalized = html.replaceAll('\\', '/').replaceAll('\r\n', '\n');
  const temporaryPaths = [...new Set((options.temporaryPaths ?? []).map((value) => value.replaceAll('\\', '/')))];
  temporaryPaths.sort((left, right) => right.length - left.length);

  for (const portablePath of temporaryPaths) {
    normalized = normalized.replace(new RegExp(escapeRegularExpression(portablePath), 'g'), '[TEMP_ROOT]');
  }

  normalized = normalized.replace(SIGNED_URL_PATTERN, '[NOTION_SIGNED_URL]');
  normalized = normalized.replace(ISO_TIMESTAMP_PATTERN, '[TIMESTAMP]');

  return `${normalized.trimEnd()}\n`;
}
