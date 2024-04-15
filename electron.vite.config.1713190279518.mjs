// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
var __electron_vite_injected_dirname = "C:\\Users\\Administrator\\Desktop\\github\\novel_push";
var electron_vite_config_default = defineConfig({
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
            __electron_vite_injected_dirname,
            "src/preload/distribute_multiple_platforms.js"
          ),
          main: resolve(__electron_vite_injected_dirname, "src/preload/main.js")
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    build: {
      rollupOptions: {
        input: {
          distribute_multiple_platforms: resolve(
            __electron_vite_injected_dirname,
            "src/renderer/distribute_multiple_platforms.html"
          ),
          // index: resolve(__dirname, 'src/renderer/index.html'),
          main: resolve(__electron_vite_injected_dirname, "src/renderer/main.html")
        }
      }
    },
    plugins: [vue()]
  }
});
export {
  electron_vite_config_default as default
};
