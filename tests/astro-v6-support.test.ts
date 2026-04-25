/**
 * Verifies Astro 6-facing loader behavior and exported schema compatibility.
 */

import { z } from 'astro/zod';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NotionPageData } from '../src/types.js';

const notionApi = vi.hoisted(() => ({
  retrieve: vi.fn(),
  queryResults: [] as any[],
}));

vi.mock('@notionhq/client', () => {
  class Client {
    dataSources = {
      retrieve: notionApi.retrieve,
      query: vi.fn(),
    };
  }

  return {
    Client,
    isFullPage: (page: { object?: string } | null | undefined) => page?.object === 'page',
    async *iteratePaginatedAPI() {
      for (const result of notionApi.queryResults) {
        yield result;
      }
    },
  };
});

import { VIRTUAL_CONTENT_ROOT } from '../src/image.js';
import { notionLoader } from '../src/loader.js';
import { NotionPageRenderer } from '../src/render.js';
import { notionPageSchema, pageObjectSchema } from '../src/schemas/page.js';
import * as rawPropertySchema from '../src/schemas/raw-properties.js';
import * as transformedPropertySchema from '../src/schemas/transformed-properties.js';

/**
 * Local test view of the schema-enabled loader shape returned by `notionLoader`.
 */
type LoaderWithSchema = ReturnType<typeof notionLoader> & {
  createSchema: () => Promise<{
    schema: unknown;
    types: string;
  }>;
};

/**
 * Small structural view of the generated schema used by this test.
 */
type InspectableSchema = {
  shape: {
    properties: {
      shape: Record<string, { description?: string }>;
    };
  };
  safeParse: (input: unknown) => { success: boolean };
};

/**
 * Creates a Notion rich text fragment for test fixtures.
 *
 * @param text The visible text content to embed.
 * @returns A minimal rich text object accepted by the page schema.
 */
function createRichText(text: string) {
  return {
    type: 'text' as const,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
    },
    plain_text: text,
    href: null,
    text: {
      content: text,
      link: null,
    },
  };
}

/**
 * Creates a representative Notion page payload for schema and loader tests.
 *
 * @param overrides Top-level fields to override for scenario-specific fixtures.
 * @returns A page-shaped object with URL, date, and datetime properties.
 */
function createPage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    object: 'page',
    id: 'page-1',
    icon: null,
    cover: null,
    archived: false,
    in_trash: false,
    url: 'https://www.notion.so/page-1',
    public_url: null,
    last_edited_time: '2026-04-25T10:00:00.000+00:00',
    properties: {
      Name: {
        type: 'title',
        id: 'title',
        title: [createRichText('Entry Title')],
      },
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
    ...overrides,
  };
}

/**
 * Creates a lightweight Astro-style logger test double.
 *
 * @param label The logger label to expose in assertions.
 * @returns A logger stub with spy-backed methods.
 */
function createLogger(label = 'notion-loader') {
  return {
    label,
    info: vi.fn(),
    debug: vi.fn(),
    fork: vi.fn((childLabel: string) => createLogger(childLabel)),
  };
}

/**
 * Creates an in-memory content store that mirrors the Astro loader contract.
 *
 * @param initialEntries Seed entries keyed by their `id` field.
 * @returns A store double with spy-backed mutation methods.
 */
function createStore(initialEntries: Array<Record<string, any>> = []) {
  const entries = new Map(initialEntries.map((entry) => [entry.id, entry]));

  return {
    entries,
    keys: () => entries.keys(),
    get: (id: string) => entries.get(id),
    set: vi.fn((entry: Record<string, any>) => {
      entries.set(entry.id, entry);
    }),
    delete: vi.fn((id: string) => {
      entries.delete(id);
    }),
  };
}

afterEach(() => {
  notionApi.retrieve.mockReset();
  notionApi.queryResults = [];
  vi.restoreAllMocks();
});

describe('notionLoader', () => {
  it('returns an Astro 6 loader with the expected names', () => {
    expect(notionLoader({ auth: 'token', data_source_id: 'ds-1' }).name).toBe('notion-loader');
    expect(notionLoader({ auth: 'token', data_source_id: 'ds-1', collectionName: 'blog' }).name).toBe(
      'notion-loader/blog'
    );
  });

  it('creates datasource schemas and stores rendered entries with preserved semantics', async () => {
    notionApi.retrieve.mockResolvedValue({
      properties: {
        Name: { type: 'title', description: 'Entry title' },
        Website: { type: 'url', description: 'Canonical URL' },
        Published: { type: 'date', description: 'Publish date' },
        Created: { type: 'created_time', description: 'Created at' },
        Updated: { type: 'last_edited_time' },
      },
    });

    const loader = notionLoader({
      auth: 'token',
      data_source_id: 'ds-1',
      collectionName: 'blog',
      experimentalCacheImageInData: true,
      experimentalRootSourceAlias: 'content',
    }) as LoaderWithSchema;

    const created = await loader.createSchema();
    const schema = created.schema as InspectableSchema;
    const properties = schema.shape.properties.shape;

    expect(created.types).toContain('"Website": typeof rawPropertySchema.url;');
    expect(properties.Website.description).toBe('Canonical URL');
    expect(schema.safeParse(createPage()).success).toBe(true);

    const page = createPage();
    expect(pageObjectSchema.safeParse(page).success).toBe(true);

    const pageData = {
      icon: page.icon,
      cover: page.cover,
      archived: page.archived,
      in_trash: page.in_trash,
      url: page.url,
      public_url: page.public_url,
      properties: page.properties as NotionPageData['properties'],
    } as NotionPageData & {
      properties: NotionPageData['properties'] & { Website: { url: string } };
    };
    const rendered = {
      html: '<p>Entry Title</p>',
      metadata: {
        imagePaths: ['assets/images/notion/page-1.png'],
        headings: [{ depth: 1, text: 'Entry Title', slug: 'entry-title' }],
      },
    };

    const getPageData = vi.spyOn(NotionPageRenderer.prototype, 'getPageData').mockResolvedValue({
      id: page.id,
      data: pageData,
    });
    vi.spyOn(NotionPageRenderer.prototype, 'render').mockResolvedValue(rendered);

    notionApi.queryResults = [page];

    const store = createStore([
      { id: page.id, digest: '2025-01-01T00:00:00.000+00:00' },
      { id: 'deleted-page', digest: '2025-01-02T00:00:00.000+00:00' },
    ]);
    const logger = createLogger('blog');
    const parseData = vi.fn(async (entry: { id: string; data: typeof pageData }) => ({
      slug: entry.id,
      website: entry.data.properties.Website.url,
    }));

    await loader.load({ store, logger, parseData } as never);

    expect(getPageData).toHaveBeenCalledWith(true, 'content');
    expect(store.delete).toHaveBeenCalledWith('deleted-page');
    expect(store.entries.get(page.id)).toEqual({
      id: page.id,
      digest: page.last_edited_time,
      data: {
        slug: page.id,
        website: page.properties.Website.url,
      },
      rendered,
      filePath: `${VIRTUAL_CONTENT_ROOT}/${page.id}.md`,
      assetImports: rendered.metadata.imagePaths,
    });
  });
});

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
