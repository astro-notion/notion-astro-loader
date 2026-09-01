import { z } from 'astro/zod';
import { externalPropertyResponse, filePropertyResponse } from './file.js';

export const pageObjectSchema = z.object({
  // `.catch(null)` keeps a page in the collection when Notion introduces an
  // icon or cover type this union does not know (e.g. `custom_emoji`);
  // without it one unrecognized icon fails the schema and silently drops the
  // whole page from the build.
  icon: z
    .discriminatedUnion('type', [
      externalPropertyResponse,
      filePropertyResponse,
      z.object({
        type: z.literal('emoji'),
        emoji: z.string(),
      }),
    ])
    .nullable()
    .catch(null),
  cover: z.discriminatedUnion('type', [externalPropertyResponse, filePropertyResponse]).nullable().catch(null),
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
