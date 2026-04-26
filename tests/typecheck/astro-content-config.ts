/**
 * Verifies `notionLoader` is accepted in an Astro 6 content collection definition.
 */

import { defineCollection } from 'astro:content';

import { notionLoader } from '../../src/index.js';

const blog = defineCollection({
  loader: notionLoader({
    auth: 'token',
    data_source_id: 'data-source-id',
  }),
});

export const collections = { blog };
