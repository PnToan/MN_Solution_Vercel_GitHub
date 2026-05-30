import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'node:child_process'
//=================
function getGitText(command, fallback = '') {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return fallback
  }
} // End getGitText

const appCommitSha = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  : getGitText('git rev-parse --short HEAD', 'local')

const appCommitName = process.env.VERCEL_GIT_COMMIT_MESSAGE
  || getGitText('git log -1 --pretty=%s', 'local dev')
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  },
    define: {
    __APP_COMMIT_SHA__: JSON.stringify(appCommitSha),
    __APP_COMMIT_NAME__: JSON.stringify(appCommitName)
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
