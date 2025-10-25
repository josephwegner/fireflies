import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    watch: false,
    server: {
      deps: {
        inline: ['phaser']
      }
    }
  },
  define: {
    'typeof WEBGL_DEBUG': '"undefined"',
    'typeof CANVAS_RENDERER': '"undefined"',
    'typeof EXPERIMENTAL': '"undefined"',
    'typeof PLUGIN_3D': '"undefined"',
    'typeof PLUGIN_CAMERA3D': '"undefined"',
    'typeof PLUGIN_FBINSTANT': '"undefined"'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
