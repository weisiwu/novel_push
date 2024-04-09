import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          // index: resolve(__dirname, 'src/preload/index.js'),
          distribute_multiple_platforms: resolve(
            __dirname,
            'src/preload/distribute_multiple_platforms.js'
          ),
          main: resolve(__dirname, 'src/preload/main.js')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: {
          distribute_multiple_platforms: resolve(
            __dirname,
            'src/renderer/distribute_multiple_platforms.html'
          ),
          // index: resolve(__dirname, 'src/renderer/index.html'),
          main: resolve(__dirname, 'src/renderer/main.html')
        }
      }
    },
    plugins: [vue()]
  }
})
