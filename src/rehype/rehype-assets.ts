import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

interface Config {
  assetPaths?: string[];
}

const ASTRO_IMAGE_FORMATS = ['avif', 'webp', 'png', 'jpg', 'jpeg', 'gif'];

function isAstroImageFormat(src: string): boolean {
  const ext = src.split('.').pop();
  return ext ? ASTRO_IMAGE_FORMATS.includes(ext.toLowerCase()) : false;
}

export function rehypeAssets() {
  return ({ assetPaths }: Config) =>
    function (tree: any, file: VFile) {
      const assetOccurrenceMap = new Map();

      visit(tree, (node) => {
        if (node.type !== 'element') return;

        if (node.properties?.src) {
          const src = decodeURI(node.properties.src);
          node.properties.src = src;

          // Add Astro metadata
          if (file.data.astro) file.data.astro.imagePaths = assetPaths;

          // Handle Astro image optimization
          if (node.tagName === 'img' && assetPaths?.includes(src) && isAstroImageFormat(src)) {
            const { ...props } = node.properties;

            // Initialize or increment occurrence count for this image
            const index = assetOccurrenceMap.get(src) || 0;
            assetOccurrenceMap.set(src, index + 1);

            // Add Astro-specific metadata for image processing
            node.properties['__ASTRO_IMAGE_'] = JSON.stringify({ ...props, index });

            // Remove original properties to prevent conflicts
            Object.keys(props).forEach((prop) => delete node.properties[prop]);

            return; // Skip further processing for Astro images
          }

          // Convert relative paths (assets in /src) to absolute paths (served from /public)
          if (src.startsWith('../')) node.properties.src = src.replace(/^(..\/)+/, '/');
          if (src.startsWith('src/')) node.properties.src = src.replace(/^src\//, '/');
        }

        // Handle href attributes similarly to src
        if (node.properties?.href?.startsWith('src/'))
          node.properties.href = node.properties.href.replace(/^src\//, '/');
      });
    };
}
