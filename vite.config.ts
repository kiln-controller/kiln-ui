import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [svelte()],
  server: {
    proxy: env.KILN_DEVICE_URL ? {
      '/api': {
        target: env.KILN_DEVICE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('if-none-match')
          })
        }
      }
    } : undefined
  },
  build: {
    sourcemap: true,
    // https://github.com/vitejs/vite/issues/378#issuecomment-768816653
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
}})
