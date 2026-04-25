import { defineConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'assets/**/*',
          dest: 'assets'
        }
      ]
    })
  ],
  server: {
    port: 8080,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: command === 'serve'
        ? { main: path.resolve(__dirname, 'index.html'), soundboard: path.resolve(__dirname, 'soundboard.html') }
        : { main: path.resolve(__dirname, 'index.html') },
      output: {
        manualChunks: {
          phaser: ['phaser'],
          miniplex: ['miniplex']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      }
    }
  }
}));
