import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * PUBLIC_INTERFACE
 * Vite configuration for Chronose Frontend.
 * - Loads only REACT_APP_ variables for the client.
 * - Ignores .env.example, .env*.example, and temp env files (e.g., .env.local, .env.temp) to stabilize dev server reloads.
 * - Ensures .env files are loaded for environment variables but not watched for noisy changes.
 */
export default defineConfig(({ mode }) => {
  // Only load environment variables prefixed with REACT_APP_
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');

  return {
    plugins: [react()],
    define: {
      'process.env': env
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
      watch: {
        // Ignore file patterns that should NOT trigger restarts
        ignored: [
          '**/.env',
          '**/.env.*',
          '**/.env.example',
          '**/.env*.example',
          '**/.env.*.example',
          '**/.env.sample',
          '**/.env*.sample',
          '**/.env.temp',
          '**/.env.local',
          '**/.env.*.local',
          '**/.env*.bak',
          '**/.env*.backup',
          '**/.env*.previous',
          '**/node_modules/**',
        ]
      }
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    }
  };
});
