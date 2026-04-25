# @astro-notion/loader

> **Notice**
>
> This is a fork version of [NotWood's Notion Loader](https://github.com/NotWoods/travel/tree/main/packages/notion-astro-loader) aiming to fix bugs when working with image assets in Notion pages.
>
> It's currently experimental, and when it's ready, it will be merged into the original repo. If you are in trouble with the same [image issue](https://github.com/withastro/astro/issues/12689), you can try this loader as a drop-in replacement.

[Notion](https://developers.notion.com/) loader for the [Astro Content Layer API](https://astro.build/blog/astro-4140/#experimental-content-layer-api). It allows you to load pages from a Notion database then render them as pages in a collection.

To use the new Astro content layer, you are recommended to use `astro@>=5.0` with stable content layer feature. For legacy users (those who use v4), you need to enable experimental support and use `astro@>=4.14`.

If you want to know more about new content layer API, you can read [Astro's blog about content layer](https://astro.build/blog/future-of-astro-content-layer/).

## Installation

```sh
# npm
npm install @astro-notion/loader --save-dev
# pnpm
pnpm add @astro-notion/loader -D
# yarn
yarn add @astro-notion/loader -D
# bun
bun add @astro-notion/loader -D
```

## Usage

If you want to see a real world blog example, you can check out [KiritoKing/notion-astro-rev](https://github.com/KiritoKing/notion-astro-rev).

If you are also using this loader to create wonderful blogs, please consider to [contact me](mailto:kiritoclzh@gmail.com) or make a PR to this repo to make showcases of your blogs.

### Step.1 Astro Config

For legacy users who use v4, you need to enable experimental support in your `astro.config.js`, while for new users, you don't need to do this.

Additionally, to make the loader able to process images properly, you need to configure `**.amazonaws.com` pattern in your `astro.config.js`.

```js
// astro.config.js
import { defineConfig } from 'astro';

export default defineConfig({
  experimental: {
    contentLayer: true,
  },
  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
});
```

### Step.2 Get Notion API Token & Database ID

You will need to create an [internal Notion integration](https://developers.notion.com/docs/authorization#internal-integration-auth-flow-set-up). You will also want to share your database with the integration.

After you get your notion token and database ID, you need to create a dot-env file in your project root dir to make it available to your loader.

```sh
# /.env
NOTION_TOKEN=your-notion-token
NOTION_DATABASE_ID=your-database-id
```

### Step.3 Set up Content Layer Config

According to [Astro Doc on Content Collections](https://docs.astro.build/en/guides/content-collections/), you can define a content collection by creating config files following specific patters:

- `src/content.config.ts` (Recommended, only work on v5 or later)
- `src/content/config.ts` (Legacy way, work for all users)

Then, you can use the loader loader in your content collection configuration:

```ts
import { defineCollection } from 'astro:content';
import { notionLoader } from '@astro-notion/loader';

const database = defineCollection({
  loader: notionLoader({
    auth: import.meta.env.NOTION_TOKEN,
    database_id: import.meta.env.NOTION_DATABASE_ID,
    // Optional: tell loader where to store downloaded aws images, relative to 'src' directory
    // Default value is 'assets/images/notion'
    imageSavePath: 'assets/images/notion',
    // Use Notion sorting and filtering with the same options like notionhq client
    filter: {
      property: 'Hidden',
      checkbox: { equals: false },
    },
  }),
});

export const collections = { database };
```

### Step.4 Enjoy and Use

Now, you successfully set up your Notion loader, which allows you to load Notion database like a local markdown directory.

Notion loader will automatically fetch pages from Notion database, render them into HTML and generate type-safe schema from database properties for you.

You can then use this collection like any other content collection in Astro, with integrated and type-safe DX.

If you are looking for an example, you can check out [my blog repository](https://github.com/chlorinec-pkgs/notion-astro-rev/tree/main/apps/blog), which is also a blog template based on AstroWind and this loader, **allowing you to use any Notion database as your CMS rather than force you to create from an existing template**.

## Options

The `notionLoader` function takes an object with the same options as the [`notionClient.databases.query`](https://developers.notion.com/reference/post-database-query) function, and the same options as the notion [`Client` constructor](https://github.com/makenotion/notion-sdk-js?tab=readme-ov-file#client-options).

- `auth`: The API key for your Notion integration.
- `database_id`: The ID of the database to load pages from.
- `imageSavePath`: The directory to save downloaded images into. Default is `assets/images/notion`.

## Advanced Utilities

### Images

> **Notice**
>
> This is **significantly different** from the original Notion loader!

Notion has 2 types of images: file and external url. Notion loader will **not** process external urls.

For file urls in **body**, the loader will try to download the images and cache them locally at the `imageSavePath` directory that defined in loader's config. You do not need to care about this process since the loader will do it automatically under the hood.

For file urls in **cover**, the loader will not download it. Instead, you are recommended to use `fileToImageAssets` API exported from the loader and `getImage` or `<Image>` API exported `astro:assets` module to tell Astro to process image while building.

#### Why & How ?

> TL;TR;
>
> The legacy way does not work on `astro@>=5.0` due to `astro:assets` API changes.
>
> By simulating the behavior of `glob` loader, this version of notion loader only "tag" images when building content collections and process it later when render.

Notion stores images in remote AWS buckets, and the url will be expired very quickly, causing images to be not fetchable or visible on your website.

So, it's very necessary to cache those images when building and emit them into our final bundle.

The original version of notion loader do this via `astro:assets` API, and try to use `getImage` function to download and process images.

However, I found it not work on `astro@>=5.0`, since Astro might change the behavior of `astro:assets` API. To solve this problem, I've been learning the source code of `glob` loader and `content-layer` API for a couple of days and finally figure out how to make this work.

I used to try the solution that downloads the images directly into `public` directory, but I think it's not a good idea since those images cannot take full use of Astro's image optimization service.

In my fork version, notion loader will download images into a directory which simulate the behavior of `glob` loader. Astro will treat those images like ESM imports and process them with configured image service. For further technical details, you can check it out in my blog later. (wip)

### Customized Schema

Helper Zod schemas are provided to let you customize and transform Notion page properties.
This can be used instead of the automatic inference.

```ts
// src/content/config.ts
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';
import { notionLoader } from 'notion-astro-loader';
import { notionPageSchema, propertySchema, transformedPropertySchema } from 'notion-astro-loader/schemas';

const database = defineCollection({
  loader: notionLoader({
    auth: import.meta.env.NOTION_TOKEN,
    database_id: import.meta.env.NOTION_DATABASE_ID,
  }),
  schema: notionPageSchema({
    properties: z.object({
      // Converts to a primitive string
      Name: transformedPropertySchema.title,
      // Converts to a Notion API created_time object
      Created: propertySchema.created_time.optional(),
    }),
  }),
});

export const collections = { database };
```

### Formatters

A few helper functions are provided for transforming Notion API objects into simple JavaScript types.

- `richTextToPlainText` converts [rich text](https://developers.notion.com/reference/rich-text) into plain strings
- `fileToUrl` converts [file objects](https://developers.notion.com/reference/file-object) to a URL string.
- `fileToImageAsset` converts [file objects](https://developers.notion.com/reference/file-object) to an image asset using the [Astro Asset API](https://docs.astro.build/en/reference/modules/astro-assets/#getimage).
- `dateToDateObjects` converts the strings in a [date property](https://developers.notion.com/reference/page-property-values#date) into `Date`s.

## FAQ

### Q1: AstroError - FailedToFetchRemoteImageDimensions

The way we process cover image might cause this issue.

Since AWS S3 url will be expired quickly, Astro might be not able to fetch images soon after you sync the content layer.

You are recommended to execute a forced sync command to refresh those urls before you build:

```sh
# Sync only
npx astro sync --force
# Build and sync
npm run build --force
```

Commands above tell Astro to refresh content layer, drop all the cache and fetch new urls from notion API.

### Q2: [AstroError - CouldNotTransformImage](https://docs.astro.build/en/reference/errors/could-not-transform-image/)

This issue has many causes, one of which is the image is over-sized.

You can try to edit the `astro.config.js` to bypass this limit:

```typescript
// astro.config.js
import { defineConfig } from 'astro/config';

export default defineConfig({
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        limitInputPixels: false, // 禁用输入大小限制
      },
    },
  },
});
```
