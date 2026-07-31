/**
 * Verifies Astro asset conversion for hosted and external Notion files.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const astroAssets = vi.hoisted(() => ({
  getImage: vi.fn(),
}));

vi.mock('astro:assets', () => ({
  getImage: astroAssets.getImage,
}));

import { fileToImageAsset } from '../src/format.js';

afterEach(() => {
  astroAssets.getImage.mockReset();
  vi.restoreAllMocks();
});

describe('fileToImageAsset', () => {
  it('passes hosted file URLs to getImage with inferSize enabled', async () => {
    const imageAsset = { src: '/_astro/file.png' };
    astroAssets.getImage.mockResolvedValue(imageAsset);

    await expect(
      fileToImageAsset({
        type: 'file',
        file: { url: 'https://cdn.example.com/file.png' },
      })
    ).resolves.toBe(imageAsset);

    expect(astroAssets.getImage).toHaveBeenCalledWith({
      src: 'https://cdn.example.com/file.png',
      inferSize: true,
    });
  });

  it('passes external file URLs to getImage with inferSize enabled', async () => {
    const imageAsset = { src: '/_astro/external.png' };
    astroAssets.getImage.mockResolvedValue(imageAsset);

    await expect(
      fileToImageAsset({
        type: 'external',
        external: { url: 'https://images.example.com/external.png' },
      })
    ).resolves.toBe(imageAsset);

    expect(astroAssets.getImage).toHaveBeenCalledWith({
      src: 'https://images.example.com/external.png',
      inferSize: true,
    });
  });
});
