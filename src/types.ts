import type { Client, isFullPage, isFullBlock, isFullDataSource } from '@notionhq/client';

/**
 * @module
 * Types from the internal Notion JS API, exposed for use in this project.
 */

export type Asserts<Function> = Function extends (input: any) => input is infer Type ? Type : never;

export type ClientOptions = NonNullable<ConstructorParameters<typeof Client>[0]>;
export interface QueryDataSourceParameters extends NonNullable<Parameters<Client['dataSources']['query']>[0]> {}

export type DataSourcePropertyConfigResponse = Asserts<typeof isFullDataSource>['properties'][string];

export type PageObjectResponse = Asserts<typeof isFullPage>;
export type Page = PageObjectResponse;
export type PageProperty = PageObjectResponse['properties'][string];
export type EmojiRequest = Extract<PageObjectResponse['icon'], { type: 'emoji' }>['emoji'];

export type RichTextItemResponse = Extract<PageProperty, { type: 'rich_text' }>['rich_text'][number];

export type NotionPageData = Pick<
  PageObjectResponse,
  'icon' | 'cover' | 'archived' | 'in_trash' | 'url' | 'public_url' | 'properties'
>;

export type Block = Asserts<typeof isFullBlock>;

export type FileBlock = Extract<Block, { type: 'file' }>;
export type ImageBlock = Extract<Block, { type: 'image' }>;
export type VideoBlock = Extract<Block, { type: 'video' }>;
export type AudioBlock = Extract<Block, { type: 'audio' }>;
export type CalloutBlock = Extract<Block, { type: 'callout' }>;
export type FilesProperty = Extract<PageProperty, { type: 'files' }>;

export type AssetObject =
  | FileBlock['file']
  | ImageBlock['image']
  | VideoBlock['video']
  | AudioBlock['audio']
  | NonNullable<CalloutBlock['callout']['icon']>
  | NonNullable<PageObjectResponse['cover']>
  | NonNullable<PageObjectResponse['icon']>
  | FilesProperty['files'][number];

export type FileObject = Extract<AssetObject, { type: 'external' | 'file' }>;
