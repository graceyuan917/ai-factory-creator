import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // 关键配置，避免资源路径错误
  server: {
    port: 5174,
    host: true, // 允许外部访问
    allowedHosts: [
      'cruelness-rearrange-satchel.ngrok-free.dev',
      '.ngrok-free.dev', // 允许所有 ngrok 子域名
      '.trycloudflare.com' // 允许所有 cloudflared 子域名
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        entryFileNames: 'main.js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})