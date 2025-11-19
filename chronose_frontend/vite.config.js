import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// PUBLIC_INTERFACE
export default defineConfig(({ mode }) => {
  // Expose only REACT_APP_ vars for client
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');
  return {
    plugins: [react()],
    define: {
      'process.env': env // Only REACT_APP_ vars
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
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    }
  };
});
