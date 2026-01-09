import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode })=>{
  const env = loadEnv(mode, process.cwd())
  console.log('env', env)
  return {
    base: './',
    publicDir: 'public',
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          dir: './dist',
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return id
                .toString()
                .split('node_modules/')[1]
                .split('/')[0]
                .toString()
            }
          }
        }
      }
    },
    server: {
      hmr: true,
      open: true,
      port: 5174,
      proxy: {
        '/api': {
          target: env.VITE_APP_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    plugins: [vue()]
  }
})
