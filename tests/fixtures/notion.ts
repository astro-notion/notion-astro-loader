/**
 * Provides representative Notion API payloads shared by runtime tests.
 */

/**
 * Creates a Notion rich text fragment for test fixtures.
 */
export function createRichText(text: string) {
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
 */
export function createPage(overrides: Partial<Record<string, unknown>> = {}) {
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
