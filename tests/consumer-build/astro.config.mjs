/** Uses Astro's passthrough image service so the fixture needs no native image dependency. */

import { defineConfig } from 'astro/config';

export default defineConfig({
  base: '/docs',
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
});
