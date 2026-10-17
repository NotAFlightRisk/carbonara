import { sentryVitePlugin } from '@sentry/vite-plugin';
import cloudflare from '@sveltejs/adapter-cloudflare';
import node from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const plausible = process.env.PUBLIC_PLAUSIBLE_SCRIPT ?? '';
const pulse = plausible ? [new URL(plausible).origin as `${string}.${string}`] : [];
const sentry = process.env.PUBLIC_SENTRY_DSN ?? '';
const oops = sentry ? [new URL(sentry).origin as `${string}.${string}`] : [];
const cloudflareBuild = process.env.ADAPTER === 'cloudflare';
const workersStandIn = fileURLToPath(new URL('src/lib/server/workers.ts', import.meta.url));
const uploadMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_URL);

export default defineConfig({
  define: {
    'import.meta.env.PUBLIC_PLAUSIBLE_SCRIPT': JSON.stringify(plausible),
    'import.meta.env.PUBLIC_SENTRY_DSN': JSON.stringify(sentry),
    'import.meta.env.SENTRY_RELEASE': JSON.stringify(process.env.GITHUB_SHA ?? '')
  },
  resolve: {
    alias: cloudflareBuild ? {} : { 'cloudflare:workers': workersStandIn }
  },
  build: {
    // fontsource subsets are small enough to inline, which the CSP would then block
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
    sourcemap: uploadMaps && 'hidden'
  },
  plugins: [
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true
      },
      adapter: cloudflareBuild ? cloudflare() : node(),
      csp: {
        mode: 'auto',
        directives: {
          'default-src': ['self'],
          'script-src': ['self', ...pulse],
          'connect-src': ['self', ...pulse, ...oops],
          'img-src': ['self', 'data:'],
          'style-src': ['self', 'unsafe-inline'],
          'font-src': ['self'],
          'base-uri': ['none'],
          'form-action': ['self'],
          'frame-ancestors': ['none']
        }
      }
    }),
    uploadMaps &&
      sentryVitePlugin({
        telemetry: false,
        release: { create: false, finalize: false, setCommits: false, deploy: false },
        bundleSizeOptimizations: { excludeDebugStatements: true, excludeTracing: true },
        sourcemaps: {
          assets: '.svelte-kit/output/client/**',
          filesToDeleteAfterUpload: '.svelte-kit/output/**/*.map'
        }
      })
  ],
  test: { include: ['tests/**/*.test.ts'] }
});
