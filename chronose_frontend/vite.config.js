import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * PUBLIC_INTERFACE
 * Vite configuration for Chronose Frontend.
 *
 * - Strictly STATIC: This config does NOT write or update any file (including itself or .env files).
 * - Only loads REACT_APP_ environment variables for frontend use.
 * - Ensures .env, .env.*, .env.example, vite.config.*, and related files are IGNORED for watch/hot-reload to prevent infinite restart loops.
 * - No dynamic code, no formatting, no hooks: content is frozen and static.
 * - See package.json for plain scripts/no postinstall/preinstall hooks.
 *
 * If server hot-reload loops persist, verify your editor/tools are *not* touching .env example files.
 */

export default defineConfig(({ mode }) => {
  // Only loads REACT_APP_* variables
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');

  return {
    plugins: [react()],
    define: {
      'process.env': env,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: false,
      strictPort: true,
      // .viteignore is NOT supported, so all patterns must be in 'ignored' below
      watch: {
        usePolling: false,
        ignored: [
          '**/.env',
          '**/.env.*',
          '**/.env.local',
          '**/.env.*.local',
          '**/.env*.sample',
          '**/.env*sample',
          '**/.env.example',
          '**/.env*.example',
          '**/.env.*.example',
          '**/.env*.bak',
          '**/.env*.backup',
          '**/.env*.previous',
          '**/.env.*.backup',
          '**/.env.*.previous',
          '**/.env.*.bak',
          '**/.env.local.*',
          '**/.env.*.local.*',
          '**/vite.config.*',
          '**/vite.config.*.*',
          '**/node_modules/**',
        ],
      },
      fs: {
        strict: false,
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    }
  };
});
