import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// PUBLIC_INTERFACE
// Vite configuration for Chronose Frontend (STATIC: Do not auto-rewrite or touch).
export default defineConfig(({ mode }) => {
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
      allowedHosts: [
        'vscode-internal-40619-beta.beta01.cloud.kavia.ai'
      ],
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
          // DO NOT IGNORE vite.config.* (Vite will hot-reload this purposely)
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
