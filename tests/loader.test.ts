/**
 * Verifies loader schema creation, lifecycle storage, caching, and query compatibility.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NotionPageData } from '../src/types.js';
import { createPage } from './fixtures/notion.js';

const notionApi = vi.hoisted(() => ({
  retrieve: vi.fn(),
  query: vi.fn(),
  iteratePaginatedAPI: vi.fn(async function* (_query: unknown, _params: unknown) {
    for (const result of notionApi.queryResults) {
      yield result;
    }
  }),
  queryResults: [] as any[],
}));

vi.mock('@notionhq/client', () => {
  class Client {
    dataSources = {
      retrieve: notionApi.retrieve,
      query: notionApi.query,
    };
  }

  return {
    Client,
    isFullPage: (page: { object?: string; properties?: unknown } | null | undefined) =>
      page?.object === 'page' && 'properties' in page,
    iteratePaginatedAPI: notionApi.iteratePaginatedAPI,
  };
});

vi.mock('astro:assets', () => ({
  getImage: vi.fn(),
}));

import { VIRTUAL_CONTENT_ROOT } from '../src/asset.js';
import { notionLoader } from '../src/loader.js';
import { NotionPageRenderer } from '../src/render.js';
import { pageObjectSchema } from '../src/schemas/page.js';

/** Local test view of the schema-enabled loader shape returned by `notionLoader`. */
type LoaderWithSchema = ReturnType<typeof notionLoader> & {
  createSchema: () => Promise<{
    schema: unknown;
    types: string;
  }>;
};

/** Small structural view of the generated schema used by this test. */
type InspectableSchema = {
  shape: {
    properties: {
      shape: Record<string, { description?: string }>;
    };
  };
  safeParse: (input: unknown) => { success: boolean };
};

/** Creates a lightweight Astro-style logger test double. */
function createLogger(label = 'notion-loader') {
  return {
    label,
    info: vi.fn(),
    debug: vi.fn(),
    fork: vi.fn((childLabel: string) => createLogger(childLabel)),
  };
}

/** Creates an in-memory content store that mirrors the Astro loader contract. */
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
  notionApi.query.mockReset();
  notionApi.iteratePaginatedAPI.mockClear();
  notionApi.queryResults = [];
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('notionLoader', () => {
  it('returns an Astro loader with the expected names', () => {
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

    expect(notionApi.iteratePaginatedAPI).toHaveBeenCalledWith(notionApi.query, {
      data_source_id: 'ds-1',
      filter_properties: undefined,
      sorts: undefined,
      filter: undefined,
    });
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

  it('skips rendering when the stored digest matches the Notion page', async () => {
    const page = createPage();
    notionApi.queryResults = [page];

    const loader = notionLoader({
      auth: 'token',
      data_source_id: 'ds-1',
    }) as LoaderWithSchema;
    const store = createStore([{ id: page.id, digest: page.last_edited_time }]);
    const parseData = vi.fn(async (entry: unknown) => entry);
    const getPageData = vi.spyOn(NotionPageRenderer.prototype, 'getPageData');
    const render = vi.spyOn(NotionPageRenderer.prototype, 'render');

    await loader.load({ store, logger: createLogger(), parseData } as never);

    expect(getPageData).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(parseData).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('stores new full pages and skips partial page responses', async () => {
    const page = createPage({ id: 'new-page' });
    notionApi.queryResults = [{ object: 'page', id: 'partial-page' }, page];

    const pageData = {
      icon: page.icon,
      cover: page.cover,
      archived: page.archived,
      in_trash: page.in_trash,
      url: page.url,
      public_url: page.public_url,
      properties: page.properties,
    };
    const rendered = {
      html: '<p>New page</p>',
      metadata: {
        imagePaths: ['assets/images/notion/new-page.png'],
        headings: [],
      },
    };
    vi.spyOn(NotionPageRenderer.prototype, 'getPageData').mockResolvedValue({ id: page.id, data: pageData } as never);
    vi.spyOn(NotionPageRenderer.prototype, 'render').mockResolvedValue(rendered);

    const store = createStore();
    const parseData = vi.fn(async (entry: { id: string }) => ({ slug: entry.id }));
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1' }) as LoaderWithSchema;

    await loader.load({ store, logger: createLogger(), parseData } as never);

    expect(store.entries.size).toBe(1);
    expect(store.entries.get(page.id)).toEqual({
      id: page.id,
      digest: page.last_edited_time,
      data: { slug: page.id },
      rendered,
      filePath: `${VIRTUAL_CONTENT_ROOT}/${page.id}.md`,
      assetImports: rendered.metadata.imagePaths,
    });
    expect(store.entries.has('partial-page')).toBe(false);
  });

  it('rerenders unchanged pages when FORCE_RERENDER is set', async () => {
    const page = createPage();
    notionApi.queryResults = [page];
    vi.stubEnv('FORCE_RERENDER', '1');

    const pageData = {
      icon: page.icon,
      cover: page.cover,
      archived: page.archived,
      in_trash: page.in_trash,
      url: page.url,
      public_url: page.public_url,
      properties: page.properties,
    };
    const rendered = {
      html: '<p>Forced update</p>',
      metadata: { imagePaths: [], headings: [] },
    };
    const getPageData = vi
      .spyOn(NotionPageRenderer.prototype, 'getPageData')
      .mockResolvedValue({ id: page.id, data: pageData } as never);
    vi.spyOn(NotionPageRenderer.prototype, 'render').mockResolvedValue(rendered);

    const store = createStore([{ id: page.id, digest: page.last_edited_time, data: { stale: true } }]);
    const parseData = vi.fn(async () => ({ stale: false }));
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1' }) as LoaderWithSchema;

    await loader.load({ store, logger: createLogger(), parseData } as never);

    expect(getPageData).toHaveBeenCalledOnce();
    expect(store.entries.get(page.id)).toMatchObject({
      id: page.id,
      digest: page.last_edited_time,
      data: { stale: false },
      rendered,
    });
  });

  it('retains the existing entry when parsed page data is rejected', async () => {
    const page = createPage();
    notionApi.queryResults = [page];

    vi.spyOn(NotionPageRenderer.prototype, 'getPageData').mockResolvedValue({
      id: page.id,
      data: {
        icon: page.icon,
        cover: page.cover,
        archived: page.archived,
        in_trash: page.in_trash,
        url: page.url,
        public_url: page.public_url,
        properties: page.properties,
      },
    } as never);
    const render = vi.spyOn(NotionPageRenderer.prototype, 'render');

    const existingEntry = { id: page.id, digest: 'previous-digest', data: { valid: true } };
    const store = createStore([existingEntry]);
    const parseData = vi.fn().mockRejectedValue(new Error('Invalid page data'));
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1' }) as LoaderWithSchema;

    await expect(loader.load({ store, logger: createLogger(), parseData } as never)).rejects.toThrow(
      'Invalid page data'
    );

    expect(render).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
    expect(store.entries.get(page.id)).toBe(existingEntry);
  });

  it('retains the existing entry when rendering rejects', async () => {
    const page = createPage();
    notionApi.queryResults = [page];

    vi.spyOn(NotionPageRenderer.prototype, 'getPageData').mockResolvedValue({
      id: page.id,
      data: {
        icon: page.icon,
        cover: page.cover,
        archived: page.archived,
        in_trash: page.in_trash,
        url: page.url,
        public_url: page.public_url,
        properties: page.properties,
      },
    } as never);
    vi.spyOn(NotionPageRenderer.prototype, 'render').mockRejectedValue(new Error('Rendering failed'));

    const existingEntry = {
      id: page.id,
      digest: 'previous-digest',
      data: { valid: true },
      rendered: {
        html: '<p>Previous content</p>',
        metadata: { imagePaths: ['previous-image.png'], headings: [] },
      },
      filePath: `${VIRTUAL_CONTENT_ROOT}/${page.id}.md`,
      assetImports: ['previous-image.png'],
    };
    const store = createStore([existingEntry]);
    const parseData = vi.fn(async () => ({ valid: false }));
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1' }) as LoaderWithSchema;

    await expect(loader.load({ store, logger: createLogger(), parseData } as never)).rejects.toThrow(
      'Rendering failed'
    );

    expect(store.set).not.toHaveBeenCalled();
    expect(store.entries.get(page.id)).toBe(existingEntry);
  });

  it('does not create an entry when its first render rejects', async () => {
    const page = createPage();
    notionApi.queryResults = [page];

    vi.spyOn(NotionPageRenderer.prototype, 'getPageData').mockResolvedValue({
      id: page.id,
      data: {
        icon: page.icon,
        cover: page.cover,
        archived: page.archived,
        in_trash: page.in_trash,
        url: page.url,
        public_url: page.public_url,
        properties: page.properties,
      },
    } as never);
    const renderingError = new Error('Rendering failed');
    vi.spyOn(NotionPageRenderer.prototype, 'render').mockRejectedValue(renderingError);

    const store = createStore();
    const parseData = vi.fn(async () => ({ valid: true }));
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1' }) as LoaderWithSchema;

    await expect(loader.load({ store, logger: createLogger(), parseData } as never)).rejects.toBe(renderingError);

    expect(store.set).not.toHaveBeenCalled();
    expect(store.entries.has(page.id)).toBe(false);
  });

  it('forwards in_trash to the data source query', async () => {
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1', in_trash: true }) as LoaderWithSchema;

    await loader.load({
      store: createStore(),
      logger: createLogger(),
      parseData: vi.fn(async (entry: unknown) => entry),
    } as never);

    expect(notionApi.iteratePaginatedAPI).toHaveBeenCalledWith(notionApi.query, {
      data_source_id: 'ds-1',
      filter_properties: undefined,
      sorts: undefined,
      filter: undefined,
      in_trash: true,
    });
  });

  it('maps deprecated archived queries to in_trash for SDK compatibility', async () => {
    const loader = notionLoader({ auth: 'token', data_source_id: 'ds-1', archived: true }) as LoaderWithSchema;

    await loader.load({
      store: createStore(),
      logger: createLogger(),
      parseData: vi.fn(async (entry: unknown) => entry),
    } as never);

    expect(notionApi.iteratePaginatedAPI).toHaveBeenCalledWith(notionApi.query, {
      data_source_id: 'ds-1',
      filter_properties: undefined,
      sorts: undefined,
      filter: undefined,
      in_trash: true,
    });
  });

  it('prefers explicit in_trash queries over deprecated archived queries', async () => {
    const loader = notionLoader({
      auth: 'token',
      data_source_id: 'ds-1',
      in_trash: false,
      archived: true,
    }) as LoaderWithSchema;

    await loader.load({
      store: createStore(),
      logger: createLogger(),
      parseData: vi.fn(async (entry: unknown) => entry),
    } as never);

    expect(notionApi.iteratePaginatedAPI).toHaveBeenCalledWith(notionApi.query, {
      data_source_id: 'ds-1',
      filter_properties: undefined,
      sorts: undefined,
      filter: undefined,
      in_trash: false,
    });
  });
});
