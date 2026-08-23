/**
 * Defines a network-free consumer collection with hosted image and media fixtures.
 */

import { defineCollection } from 'astro:content';

import { notionLoader, type ClientOptions } from '@astro-notion/loader';

const DATA_SOURCE_ID = 'data-source-id';
const PAGE_ID = 'page-id';
const ASSET_ORIGIN = 'https://prod-files-secure.s3.us-west-2.amazonaws.com';

/** Converts a base64 fixture into bytes without requiring Node.js types in the consumer. */
function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

const assetBodies = new Map([
  [
    `${ASSET_ORIGIN}/parent-id/image-id/image.png`,
    decodeBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nH0AAAAASUVORK5CYII='),
  ],
  [`${ASSET_ORIGIN}/parent-id/file-id/document.pdf`, new TextEncoder().encode('consumer-pdf')],
  [`${ASSET_ORIGIN}/parent-id/pdf-id/inline.pdf`, new TextEncoder().encode('consumer-inline-pdf')],
  [`${ASSET_ORIGIN}/parent-id/video-id/video.mp4`, new TextEncoder().encode('consumer-video')],
  [`${ASSET_ORIGIN}/parent-id/audio-id/audio.mp3`, new TextEncoder().encode('consumer-audio')],
]);

/** Creates the rich-text payload expected by Notion blocks and title properties. */
function createRichText(text: string) {
  return {
    type: 'text',
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
    text: { content: text, link: null },
  };
}

const page = {
  object: 'page',
  id: PAGE_ID,
  icon: null,
  cover: null,
  archived: false,
  in_trash: false,
  url: 'https://www.notion.so/page-id',
  public_url: null,
  last_edited_time: '2026-04-25T10:00:00.000+00:00',
  properties: {
    Name: {
      type: 'title',
      id: 'title',
      title: [createRichText('Consumer media fixture')],
    },
  },
};

const blocks = [
  {
    object: 'block',
    id: 'image-block',
    type: 'image',
    has_children: false,
    image: {
      type: 'file',
      file: { url: `${ASSET_ORIGIN}/parent-id/image-id/image.png`, expiry_time: '2026-07-28T00:00:00.000Z' },
      caption: [createRichText('Hosted image')],
    },
  },
  {
    object: 'block',
    id: 'file-block',
    type: 'file',
    has_children: false,
    file: {
      type: 'file',
      file: { url: `${ASSET_ORIGIN}/parent-id/file-id/document.pdf`, expiry_time: '2026-07-28T00:00:00.000Z' },
      caption: [createRichText('Hosted PDF')],
    },
  },
  {
    object: 'block',
    id: 'video-block',
    type: 'video',
    has_children: false,
    video: {
      type: 'file',
      file: { url: `${ASSET_ORIGIN}/parent-id/video-id/video.mp4`, expiry_time: '2026-07-28T00:00:00.000Z' },
      caption: [createRichText('Hosted video')],
    },
  },
  {
    object: 'block',
    id: 'pdf-block',
    type: 'pdf',
    has_children: false,
    pdf: {
      type: 'file',
      file: { url: `${ASSET_ORIGIN}/parent-id/pdf-id/inline.pdf`, expiry_time: '2026-07-28T00:00:00.000Z' },
      caption: [createRichText('Hosted inline PDF')],
    },
  },
  {
    object: 'block',
    id: 'audio-block',
    type: 'audio',
    has_children: false,
    audio: {
      type: 'file',
      file: { url: `${ASSET_ORIGIN}/parent-id/audio-id/audio.mp3`, expiry_time: '2026-07-28T00:00:00.000Z' },
      caption: [createRichText('Hosted audio')],
    },
  },
];

/** Returns deterministic Notion API and hosted-asset responses for the consumer build. */
async function fixtureFetch(input: string | URL | Request): Promise<Response> {
  const requestUrl = input instanceof Request ? input.url : input.toString();
  const url = new URL(requestUrl);
  const assetBody = assetBodies.get(`${url.origin}${url.pathname}`);

  if (assetBody) return new Response(assetBody.buffer as ArrayBuffer);

  if (url.pathname === `/v1/data_sources/${DATA_SOURCE_ID}`) {
    return Response.json({
      object: 'data_source',
      id: DATA_SOURCE_ID,
      properties: {
        Name: { id: 'title', name: 'Name', type: 'title', title: {} },
      },
    });
  }

  if (url.pathname === `/v1/data_sources/${DATA_SOURCE_ID}/query`) {
    return Response.json({ object: 'list', results: [page], next_cursor: null, has_more: false });
  }

  if (url.pathname === `/v1/blocks/${PAGE_ID}/children`) {
    return Response.json({ object: 'list', results: blocks, next_cursor: null, has_more: false });
  }

  return new Response('Unexpected fixture request', { status: 404 });
}

globalThis.fetch = fixtureFetch;

const media = defineCollection({
  loader: notionLoader({
    auth: 'consumer-token',
    data_source_id: DATA_SOURCE_ID,
    fetch: fixtureFetch as NonNullable<ClientOptions['fetch']>,
    publicPath: 'public/notion-assets',
  }),
});

export const collections = { media };
