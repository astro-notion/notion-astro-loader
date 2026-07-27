/** Marks rendered Notion images for Astro image processing. */

import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

/** Image paths supplied to the rehype plugin. */
interface Config {
  imagePaths?: string[];
}

/** Astro metadata used by the unified processor when it is available. */
interface AstroVFileData {
  localImagePaths?: string[];
}

export function rehypeImages() {
  return ({ imagePaths }: Config) =>
    function (tree: any, file: VFile) {
      const imageOccurrenceMap = new Map();

      visit(tree, (node) => {
        if (node.type !== 'element') return;
        if (node.tagName !== 'img') return;

        if (node.properties?.src) {
          node.properties.src = decodeURI(node.properties.src);
          const astroData = file.data.astro as AstroVFileData | undefined;
          if (astroData) astroData.localImagePaths = imagePaths;

          if (imagePaths?.includes(node.properties.src)) {
            const { ...props } = node.properties;

            // Initialize or increment occurrence count for this image
            const index = imageOccurrenceMap.get(node.properties.src) || 0;
            imageOccurrenceMap.set(node.properties.src, index + 1);

            node.properties['__ASTRO_IMAGE_'] = JSON.stringify({ ...props, index });

            Object.keys(props).forEach((prop) => {
              delete node.properties[prop];
            });
          }
        }
      });
    };
}
