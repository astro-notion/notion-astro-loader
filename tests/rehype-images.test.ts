/**
 * Verifies Astro image metadata produced by the image rehype plugin.
 */

import { VFile } from 'vfile';
import { describe, expect, it } from 'vitest';

import { rehypeImages } from '../src/rehype/rehype-images.js';

describe('rehypeImages', () => {
  it('records rendered Notion image paths and marks matching images', () => {
    const astroData = {};
    const file = new VFile();
    file.data.astro = astroData;
    const image = {
      type: 'element',
      tagName: 'img',
      properties: { src: 'src/notion.png' },
      children: [],
    };
    const tree = { type: 'root', children: [image] };

    rehypeImages()({ imagePaths: ['src/notion.png'] })(tree, file);

    expect(astroData).toEqual({ localImagePaths: ['src/notion.png'] });
    expect(image.properties).toEqual({
      __ASTRO_IMAGE_: JSON.stringify({ src: 'src/notion.png', index: 0 }),
    });
  });
});
