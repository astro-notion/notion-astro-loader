# @astro-notion/loader

[Notion](https://developers.notion.com/) loader for the [Astro Content Layer API](https://docs.astro.build/en/guides/content-collections/). It allows you to load pages from a Notion data source, then render them as entries in a collection.

> **History**
>
> This package began as a fork of [NotWood's Notion Loader](https://github.com/NotWoods/travel/tree/main/packages/notion-astro-loader) to fix image-asset handling (see the original [image issue](https://github.com/withastro/astro/issues/12689)). It is now maintained as `@astro-notion/loader`.

This release line targets `astro@>=6 <8` and Node.js `>=22.13.0`.

Upgrading from `1.1.2`? Read the [2.0 migration guide](docs/migrations/2.0.md) and [2.0.0 release notes](docs/releases/2.0.0.md).

Contributions are welcome. See [Contributing and Releasing](docs/CONTRIBUTING.md) for contributor expectations and the canonical maintainer release procedure.

## Installation

Requirements:

- Astro `>=6 <8`
- Node.js `>=22.13.0`

Astro 6 and Astro 7 use the same loader configuration and public exports. No version-specific consumer setup or behavioral differences are currently known. `fileToImageAsset` remains server-only under both supported majors because Astro's `getImage()` API relies on server-only APIs.

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

Configure the Notion-hosted image pattern in your `astro.config.js` so Astro can fetch remote images referenced by Notion.

```js
// astro.config.js
import { defineConfig } from 'astro/config';

export default defineConfig({
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

### Step.2 Get Notion API Token & Data Source ID

You will need to create an [internal Notion integration](https://developers.notion.com/docs/authorization#internal-integration-auth-flow-set-up). You will also want to share the relevant Notion workspace content with the integration so it can access the data source you plan to query.

After you get your notion token and data source ID, you need to create a dot-env file in your project root dir to make it available to your loader.

> **Terminology note**
>
> In the newer Notion API/SDK model, a database is a container that can include multiple child data sources.
> Querying/fetching pages directly from a database is deprecated, so integrations should query a specific data source and provide `data_source_id`.
> Read Notion's explanation of the model here: [Data sources and linked databases](https://www.notion.com/help/data-sources-and-linked-databases).

```sh
# /.env
NOTION_TOKEN=your-notion-token
NOTION_DATASOURCE_ID=your-data-source-id
```

### Step.3 Set up Content Layer Config

Create your content collection config and use the loader in the collection definition:

```ts
import { defineCollection } from 'astro:content';
import { notionLoader } from '@astro-notion/loader';

const posts = defineCollection({
  loader: notionLoader({
    auth: import.meta.env.NOTION_TOKEN,
    data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
    // Optional: store Notion-hosted images below src for Astro image processing
    // Default value is 'assets/images/notion'
    imageSavePath: 'assets/images/notion',
    // Optional: store Notion-hosted documents and media below Astro's public directory
    // Default value is Astro's configured publicDir
    publicPath: 'public/notion-assets',
    // Use Notion sorting and filtering with the same options like notionhq client
    filter: {
      property: 'Hidden',
      checkbox: { equals: false },
    },
  }),
});

export const collections = { posts };
```

### Step.4 Enjoy and Use

Now, you successfully set up your Notion loader, which allows you to load a Notion data source like a local markdown directory.

Notion loader will automatically fetch pages from your Notion data source, render them into HTML, and generate a type-safe schema from the data source properties for you.

You can then use this collection like any other content collection in Astro, with integrated and type-safe DX.

If you are looking for an example, you can check out [my blog repository](https://github.com/chlorinec-pkgs/notion-astro-rev/tree/main/apps/blog), which is also a blog template based on AstroWind and this loader, **allowing you to use a Notion-backed data source as your CMS rather than forcing you to start from an existing template**.

## Options

The `notionLoader` function takes an object with the same options as `notionClient.dataSources.query`, and the same options as the notion [`Client` constructor](https://github.com/makenotion/notion-sdk-js?tab=readme-ov-file#client-options).

- `auth`: The API key for your Notion integration.
- `data_source_id`: The Notion data source ID to load pages from.
- `imageSavePath`: The `src`-relative directory for downloaded images processed by Astro. Default is `assets/images/notion`.
- `publicPath`: The project-relative directory for downloaded documents, PDFs, video, and audio served directly by Astro. It must be inside Astro's configured `publicDir` and defaults to `publicDir`.
- `experimentalCacheImageInData`: Localizes hosted covers and icons under `imageSavePath` and hosted file properties under `publicPath`. External URLs remain unchanged. Default is `false`.

## Advanced Utilities

### Images

> **Notice**
>
> This is **significantly different** from the original Notion loader!

Notion assets can use hosted `file` URLs or external URLs. The loader downloads hosted files because their signed URLs expire, while external image, document, and media URLs pass through unchanged.

Hosted images in page content are cached below `src/<imageSavePath>` and registered with Astro's asset pipeline. Hosted documents, PDFs, video, and audio are cached below `publicPath` and rendered as URLs beneath Astro's configured base path. Keeping these destinations separate lets Astro optimize images without treating directly served files as image imports.

Hosted covers, icons, and file properties retain their original URLs by default. Enable `experimentalCacheImageInData` to localize them using the same source-image and public-asset destinations. Alternatively, use the `fileToImageAsset` helper exported from `@astro-notion/loader` from server-side Astro code to convert a Notion image file object into a `GetImageResult`.

`fileToImageAsset` is a server-only helper under Astro 6 and Astro 7 because it calls `getImage()` from `astro:assets`. Use it in build-time or server execution paths such as content loaders, `.astro` frontmatter, endpoints, or other server code. Do not use it in hydrated client components or browser-only code.

#### Why & How ?

> TL;DR;
>
> Cover images need to be processed on the server.
>
> By simulating the behavior of `glob` loader, this version of notion loader only "tag" images when building content collections and process it later when render.

Notion stores images in remote AWS buckets, and the url will be expired very quickly, causing images to be not fetchable or visible on your website.

So, it's very necessary to cache those images when building and emit them into our final bundle.

The original version of notion loader do this via `astro:assets` API, and try to use `getImage` function to download and process images.

In this fork, the image handling flow stays aligned with Astro's current content layer and asset pipeline instead of relying on older compatibility behavior.

I used to try the solution that downloads the images directly into `public` directory, but I think it's not a good idea since those images cannot take full use of Astro's image optimization service.

In my fork version, notion loader will download images into a directory which simulate the behavior of `glob` loader. Astro will treat those images like ESM imports and process them with configured image service. For further technical details, you can check it out in my blog later. (wip)

### Customized Schema

Helper Zod schemas are provided to let you customize and transform Notion page properties.
This can be used instead of the automatic inference.

```ts
// src/content/config.ts
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';
import { notionLoader } from '@astro-notion/loader';
import { notionPageSchema, propertySchema, transformedPropertySchema } from '@astro-notion/loader/schemas';

const posts = defineCollection({
  loader: notionLoader({
    auth: import.meta.env.NOTION_TOKEN,
    data_source_id: import.meta.env.NOTION_DATASOURCE_ID,
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

export const collections = { posts };
```

### Formatters

A few helper functions are provided for transforming Notion API objects into simple JavaScript types.

- `richTextToPlainText` converts [rich text](https://developers.notion.com/reference/rich-text) into plain strings
- `fileToUrl` converts [file objects](https://developers.notion.com/reference/file-object) to a URL string.
- `fileToImageAsset` converts [file objects](https://developers.notion.com/reference/file-object) to an image asset using the [Astro Asset API](https://docs.astro.build/en/reference/modules/astro-assets/#getimage). This helper is server-only under Astro 6 and Astro 7.
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
