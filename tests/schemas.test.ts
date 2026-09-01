/**
 * Verifies representative raw and transformed Notion property schemas.
 */

import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { notionPageSchema } from '../src/schemas/page.js';
import * as rawPropertySchema from '../src/schemas/raw-properties.js';
import * as transformedPropertySchema from '../src/schemas/transformed-properties.js';
import { createPage } from './fixtures/notion.js';

describe('exported schemas', () => {
  it('builds page schemas from exported URL and datetime-heavy property validators', () => {
    const schema = notionPageSchema({
      properties: z.object({
        Website: rawPropertySchema.url,
        Published: rawPropertySchema.date,
        Created: rawPropertySchema.created_time,
        Updated: rawPropertySchema.last_edited_time,
      }),
    });

    const page = createPage({
      properties: {
        Website: {
          type: 'url',
          id: 'website',
          url: 'https://example.com/posts/entry-title',
        },
        Published: {
          type: 'date',
          id: 'published',
          date: {
            start: '2026-04-25',
            end: '2026-04-26T10:00:00.000+00:00',
            time_zone: 'UTC',
          },
        },
        Created: {
          type: 'created_time',
          id: 'created',
          created_time: '2026-04-25T10:00:00.000+00:00',
        },
        Updated: {
          type: 'last_edited_time',
          id: 'updated',
          last_edited_time: '2026-04-25T11:30:00.000+00:00',
        },
      },
    });

    const parsed = schema.parse(page);

    expect(parsed.properties.Website.url).toBe('https://example.com/posts/entry-title');
    expect(parsed.properties.Published.date?.start).toBe('2026-04-25');
    expect(parsed.properties.Created.created_time).toBe('2026-04-25T10:00:00.000+00:00');
    expect(parsed.properties.Updated.last_edited_time).toBe('2026-04-25T11:30:00.000+00:00');
  });

  it('parses unrecognized icon and cover types to null instead of failing the page', () => {
    const schema = notionPageSchema({ properties: z.object({}).passthrough() });

    // `custom_emoji` is a real icon type Notion added after this union was
    // written; any future type should degrade the same way.
    const parsed = schema.parse(
      createPage({
        icon: {
          type: 'custom_emoji',
          custom_emoji: { id: 'emoji-1', name: 'wave', url: 'https://example.com/wave.png' },
        },
        cover: { type: 'unrecognized_future_type' },
      })
    );

    expect(parsed.icon).toBeNull();
    expect(parsed.cover).toBeNull();

    // Recognized values still pass through untouched.
    const recognized = schema.parse(
      createPage({
        icon: { type: 'emoji', emoji: '🌊' },
        cover: { type: 'external', external: { url: 'https://example.com/cover.jpg' } },
      })
    );

    expect(recognized.icon).toEqual({ type: 'emoji', emoji: '🌊' });
    expect(recognized.cover).toEqual({ type: 'external', external: { url: 'https://example.com/cover.jpg' } });
  });

  it('preserves transformed outputs for representative URL, date, and datetime properties', () => {
    expect(
      transformedPropertySchema.url.parse({
        type: 'url',
        id: 'website',
        url: 'https://example.com/posts/entry-title',
      })
    ).toBe('https://example.com/posts/entry-title');

    expect(
      transformedPropertySchema.date.parse({
        type: 'date',
        id: 'published',
        date: {
          start: '2026-04-25',
          end: '2026-04-26T10:00:00.000+00:00',
          time_zone: 'UTC',
        },
      })
    ).toEqual({
      start: new Date('2026-04-25'),
      end: new Date('2026-04-26T10:00:00.000+00:00'),
      time_zone: 'UTC',
    });

    expect(
      transformedPropertySchema.created_time
        .parse({
          type: 'created_time',
          id: 'created',
          created_time: '2026-04-25T10:00:00.000+00:00',
        })
        .toISOString()
    ).toBe('2026-04-25T10:00:00.000Z');
  });
});
