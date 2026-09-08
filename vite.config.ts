import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 字体文件名带 content hash，无法在 index.html 里硬编码，
// 故在构建结束时从 bundle 中取出 400 字重 woff2 并自动注入 <link rel="preload">。
// 只预加载 400（首屏正文/基础等宽），避免把 7 个字体文件全部提前下载。
function fontPreload(): Plugin {
  let base = '/'
  return {
    name: 'font-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base ?? '/'
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const prefix = base.endsWith('/') ? base : `${base}/`
        const links = Object.keys(bundle)
          .filter((name) => /(inter|jetbrains-mono)-latin-400-normal-[\w-]+\.woff2$/.test(name))
          .map(
            (name) =>
              `    <link rel="preload" href="${prefix}${name}" as="font" type="font/woff2" crossorigin />`,
          )
        if (!links.length) return html
        return html.replace('</head>', `\n${links.join('\n')}\n  </head>`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), fontPreload()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('@vue')) {
              return 'vendor-vue'
            }
            if (id.includes('codemirror') || id.includes('@codemirror')) {
              return 'vendor-codemirror'
            }
            if (id.includes('sql-formatter')) {
              return 'vendor-utils'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
