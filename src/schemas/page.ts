import { z } from 'astro/zod';
import { externalPropertyResponse, filePropertyResponse } from './file.js';

const KNOWN_ICON_TYPES = new Set(['external', 'file', 'emoji']);
const KNOWN_COVER_TYPES = new Set(['external', 'file']);

/** Replaces values with unsupported string type tags so known variants remain strictly validated. */
function nullForUnrecognizedType(value: unknown, knownTypes: ReadonlySet<string>): unknown {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return value;
  }

  const type = value.type;
  if (typeof type !== 'string' || knownTypes.has(type)) {
    return value;
  }

  return null;
}

export const pageObjectSchema = z.object({
  // Notion can add icon and cover types; discard only unsupported type tags.
  icon: z.preprocess(
    (value) => nullForUnrecognizedType(value, KNOWN_ICON_TYPES),
    z
      .discriminatedUnion('type', [
        externalPropertyResponse,
        filePropertyResponse,
        z.object({
          type: z.literal('emoji'),
          emoji: z.string(),
        }),
      ])
      .nullable()
  ),
  cover: z.preprocess(
    (value) => nullForUnrecognizedType(value, KNOWN_COVER_TYPES),
    z.discriminatedUnion('type', [externalPropertyResponse, filePropertyResponse]).nullable()
  ),
  archived: z.boolean(),
  in_trash: z.boolean(),
  url: z.string().url(),
  public_url: z.string().url().nullable(),
  properties: z.object({}).catchall(
    z
      .object({
        type: z.string(),
        id: z.string(),
      })
      .passthrough()
  ),
});

/**
 * Defines a schema for a Notion page with a specific set of properties.
 * @example
 * const schema = notionPageSchema({
 *   properties: {
 *     Name: z.object({}),
 *     Hidden: transformedPropertySchema.checkbox.optional(),
 *   }
 * });
 */
export function notionPageSchema<Schema extends z.ZodTypeAny>({ properties }: { properties: Schema }) {
  return pageObjectSchema.extend({ properties });
}
