import { defineConfig } from 'vite';
import { introBootstrap, introPrepaintCSS } from '../../packages/ui/src/intro-session';
export default defineConfig({
  plugins: [{ name: 'intro-before-paint', transformIndexHtml() { return [
    { tag: 'style', children: introPrepaintCSS, injectTo: 'head-prepend' },
    { tag: 'script', children: introBootstrap, injectTo: 'head-prepend' },
  ]; } }],
  // Shared TSX lives outside this app's tsconfig discovery root.
  esbuild: { jsx: 'automatic' },
  resolve: { dedupe: ['react', 'react-dom'] },
});
