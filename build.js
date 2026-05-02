const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: [
    'src/content/sreality.ts',
    'src/content/mmreality.ts',
    'src/background/service-worker.ts',
    'src/popup/popup.ts',
    'src/overview/overview.ts',
    'src/workflow/workflow.ts',
  ],
  bundle: true,
  loader: { '.css': 'text' },
  outdir: 'dist',
  outbase: 'src',
  platform: 'browser',
  target: 'chrome120',
  format: 'iife',
  sourcemap: isWatch ? 'inline' : false,
};

if (isWatch) {
  esbuild.context(config).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(config).catch(() => process.exit(1));
}