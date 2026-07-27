/**
 * Verifies the public loader and schema exports in an Astro content collection definition.
 * Root type checking maps these imports to source; compatibility runs compile this file against the packed package.
 */

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

import { notionLoader } from '@astro-notion/loader';
import { notionPageSchema, transformedPropertySchema } from '@astro-notion/loader/schemas';

const blog = defineCollection({
  loader: notionLoader({
    auth: 'token',
    data_source_id: 'data-source-id',
  }),
  schema: notionPageSchema({
    properties: z.object({
      Name: transformedPropertySchema.title,
    }),
  }),
});

export const collections = { blog };
