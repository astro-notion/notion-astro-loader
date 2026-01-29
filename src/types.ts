import type { Client, isFullPage, isFullBlock, isFullDatabase } from '@notionhq/client';
import type { Plugin } from 'unified';

/**
 * @module
 * Types from the internal Notion JS API, exposed for use in this project.
 */

export type Asserts<Function> = Function extends (input: any) => input is infer Type ? Type : never;

export type ClientOptions = NonNullable<ConstructorParameters<typeof Client>[0]>;
export interface QueryDatabaseParameters extends NonNullable<Parameters<Client['databases']['query']>[0]> {}

export type DatabasePropertyConfigResponse = Asserts<typeof isFullDatabase>['properties'][string];

export type Page = Asserts<typeof isFullPage>;
export type PageProperty = Page['properties'][string];
export type EmojiRequest = Extract<Page['icon'], { type: 'emoji' }>['emoji'];

export type RichTextItemResponse = Extract<PageProperty, { type: 'rich_text' }>['rich_text'][number];

export type NotionPageData = Pick<
  Page,
  'icon' | 'cover' | 'archived' | 'in_trash' | 'url' | 'public_url' | 'properties'
>;

export type Block = Asserts<typeof isFullBlock>;

export type FileBlock = Extract<Block, { type: 'file' }>;
export type ImageBlock = Extract<Block, { type: 'image' }>;
export type VideoBlock = Extract<Block, { type: 'video' }>;
export type AudioBlock = Extract<Block, { type: 'audio' }>;

export type CalloutBlock = Extract<Block, { type: 'callout' }>;

export type AssetObject =
  | FileBlock['file']
  | ImageBlock['image']
  | VideoBlock['video']
  | AudioBlock['audio']
  | CalloutBlock['callout']['icon'];
// | Extract<Page['properties'], { type: 'files' }>['files'][number];

export type RehypePlugin = Plugin<any[], any>;
