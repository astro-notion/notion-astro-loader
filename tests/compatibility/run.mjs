/**
 * Runs the package compatibility contract against one exact Astro version.
 */

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stagedPaths = [
  'package.json',
  'tsconfig.json',
  'src',
  'tests/fixtures',
  'tests/format.test.ts',
  'tests/loader.test.ts',
  'tests/rehype-assets.test.ts',
  'tests/schemas.test.ts',
  'tests/tsconfig.json',
  'tests/typecheck',
];

/** Runs a command in the isolated compatibility package. */
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: 'true' },
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
}

/** Copies the source and compatibility fixtures into an isolated package directory. */
async function stagePackage(stagingDirectory, astroVersion) {
  for (const relativePath of stagedPaths) {
    await cp(path.join(repositoryRoot, relativePath), path.join(stagingDirectory, relativePath), { recursive: true });
  }

  const packagePath = path.join(stagingDirectory, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.devDependencies.astro = astroVersion;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

/** Fails when pnpm did not install the exact requested Astro major and version. */
async function assertAstroVersion(stagingDirectory, expectedMajor, expectedVersion, environmentName) {
  const astroPackagePath = path.join(stagingDirectory, 'node_modules/astro/package.json');
  const astroPackageJson = JSON.parse(await readFile(astroPackagePath, 'utf8'));
  const resolvedMajor = Number.parseInt(astroPackageJson.version.split('.')[0], 10);

  if (resolvedMajor !== expectedMajor || astroPackageJson.version !== expectedVersion) {
    throw new Error(
      `Expected Astro ${expectedVersion} (major ${expectedMajor}), but resolved ${astroPackageJson.version}`
    );
  }

  console.log(`Verified ${environmentName} Astro ${astroPackageJson.version}`);
}

/** Packs the built loader and returns the resulting tarball path. */
function packPackage(packageDirectory, destinationDirectory) {
  const result = spawnSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destinationDirectory], {
    cwd: packageDirectory,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`npm pack exited with status ${result.status}: ${result.stderr}`);
  }

  const [{ filename }] = JSON.parse(result.stdout);
  return path.join(destinationDirectory, filename);
}

/** Creates a standalone consumer that depends on the packed local loader. */
async function stageConsumer(consumerDirectory, tarballPath, astroVersion) {
  const sourcePackageJson = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
  const consumerPackageJson = {
    private: true,
    type: 'module',
    packageManager: sourcePackageJson.packageManager,
    dependencies: {
      '@astro-notion/loader': `file:${tarballPath}`,
      astro: astroVersion,
    },
    devDependencies: {
      typescript: sourcePackageJson.devDependencies.typescript,
    },
  };
  const consumerTsconfig = {
    extends: 'astro/tsconfigs/strictest',
    compilerOptions: {
      types: ['astro/client'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      noEmit: true,
    },
    include: ['src/**/*.ts'],
  };

  await mkdir(path.join(consumerDirectory, 'src', 'pages'), { recursive: true });
  await cp(
    path.join(repositoryRoot, 'tests/consumer-build/content.config.ts'),
    path.join(consumerDirectory, 'src/content.config.ts')
  );
  await cp(
    path.join(repositoryRoot, 'tests/consumer-build/index.astro'),
    path.join(consumerDirectory, 'src/pages/index.astro')
  );
  await cp(
    path.join(repositoryRoot, 'tests/consumer-build/astro.config.mjs'),
    path.join(consumerDirectory, 'astro.config.mjs')
  );
  await writeFile(path.join(consumerDirectory, 'package.json'), `${JSON.stringify(consumerPackageJson, null, 2)}\n`);
  await writeFile(path.join(consumerDirectory, 'tsconfig.json'), `${JSON.stringify(consumerTsconfig, null, 2)}\n`);
}

/** Verifies the standalone consumer installed the packed loader contract. */
async function assertPackedLoader(consumerDirectory) {
  const loaderPackagePath = path.join(consumerDirectory, 'node_modules/@astro-notion/loader/package.json');
  const loaderPackageJson = JSON.parse(await readFile(loaderPackagePath, 'utf8'));

  if (loaderPackageJson.peerDependencies?.astro !== '>=6 <8') {
    throw new Error(`Expected packed Astro peer range >=6 <8, but found ${loaderPackageJson.peerDependencies?.astro}`);
  }

  console.log(`Verified packed ${loaderPackageJson.name}@${loaderPackageJson.version}`);
}

/** Verifies Astro emitted every hosted asset and replaced source paths with final public URLs. */
async function assertConsumerBuild(consumerDirectory) {
  const outputDirectory = path.join(consumerDirectory, 'dist');
  const html = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
  const expectedMedia = [
    ['file-id.pdf', 'consumer-pdf'],
    ['pdf-id.pdf', 'consumer-inline-pdf'],
    ['video-id.mp4', 'consumer-video'],
    ['audio-id.mp3', 'consumer-audio'],
  ];

  for (const [fileName, expectedContent] of expectedMedia) {
    const outputPath = path.join(outputDirectory, 'notion-assets', 'parent-id', fileName);
    const publicUrl = `/docs/notion-assets/parent-id/${fileName}`;

    if (!html.includes(publicUrl)) {
      throw new Error(`Consumer output does not reference ${publicUrl}`);
    }
    if ((await readFile(outputPath, 'utf8')) !== expectedContent) {
      throw new Error(`Consumer output has unexpected content for ${publicUrl}`);
    }
  }

  const imageSource = html.match(/<img[^>]+src="([^"]+)"/)?.[1];
  if (!imageSource?.startsWith('/docs/_astro/')) {
    throw new Error(`Expected an Astro image URL, but found ${imageSource ?? 'no image source'}`);
  }
  await readFile(path.join(outputDirectory, imageSource.replace('/docs/', '/')));

  if (html.includes('prod-files-secure') || html.includes('../../assets/')) {
    throw new Error('Consumer output contains an unresolved hosted asset URL');
  }

  console.log('Verified consumer build media output');
}

/** Stages and verifies one supported Astro version. */
async function main() {
  const [expectedMajorArgument, astroVersion] = process.argv.slice(2);
  const expectedMajor = Number.parseInt(expectedMajorArgument, 10);

  if (!Number.isInteger(expectedMajor) || !astroVersion) {
    throw new Error('Usage: node tests/compatibility/run.mjs <expected-major> <exact-version>');
  }

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), `notion-astro-loader-astro-${expectedMajor}-`));
  const packageDirectory = path.join(temporaryDirectory, 'package-source');
  const consumerDirectory = path.join(temporaryDirectory, 'consumer');

  try {
    await mkdir(packageDirectory);
    await mkdir(consumerDirectory);
    await stagePackage(packageDirectory, astroVersion);
    run('pnpm', ['install', '--no-frozen-lockfile', '--ignore-scripts', '--prefer-offline'], packageDirectory);
    await assertAstroVersion(packageDirectory, expectedMajor, astroVersion, 'source package');
    run('pnpm', ['build'], packageDirectory);
    run('pnpm', ['typecheck'], packageDirectory);
    run(
      'pnpm',
      [
        'exec',
        'vitest',
        'run',
        'tests/format.test.ts',
        'tests/loader.test.ts',
        'tests/rehype-assets.test.ts',
        'tests/schemas.test.ts',
      ],
      packageDirectory
    );

    const tarballPath = packPackage(packageDirectory, temporaryDirectory);
    await stageConsumer(consumerDirectory, tarballPath, astroVersion);
    run(
      'pnpm',
      ['install', '--strict-peer-dependencies', '--no-frozen-lockfile', '--ignore-scripts', '--prefer-offline'],
      consumerDirectory
    );
    await assertAstroVersion(consumerDirectory, expectedMajor, astroVersion, 'consumer');
    await assertPackedLoader(consumerDirectory);
    run('pnpm', ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'], consumerDirectory);
    run(
      'node',
      [
        '--input-type=module',
        '--eval',
        "await import('@astro-notion/loader'); await import('@astro-notion/loader/schemas');",
      ],
      consumerDirectory
    );
    run('pnpm', ['exec', 'astro', 'build'], consumerDirectory);
    await assertConsumerBuild(consumerDirectory);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
