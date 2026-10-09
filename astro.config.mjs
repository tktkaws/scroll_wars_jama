// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    // Prebundle CommonJS for Astro's server runner and prepare client libraries.
    environments: {
      ssr: {
        optimizeDeps: {
          noDiscovery: true,
          include: ['picomatch', 'yaml', 'p-queue'],
        },
      },
      client: { optimizeDeps: { include: ['lenis', 'three'] } },
    },
    plugins: [{
      name: 'prepare-server-dependencies',
      apply: 'serve',
      enforce: 'pre',
      async configureServer(server) {
        // Cold-start optimization invalidates the runner's module cache. Finish
        // it before Astro registers its per-manifest development environment.
        const optimizer = server.environments.ssr.depsOptimizer;
        if (!optimizer) return;
        await optimizer.init();
        await Promise.all(Object.values(optimizer.metadata.discovered).map(dep => dep.processing));
      },
    }],
  },
});
