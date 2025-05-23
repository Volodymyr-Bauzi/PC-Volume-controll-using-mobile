import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { ConfigEnv, UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine if we're in development mode
  const isDevelopment = mode === 'development';
  
  return {
    plugins: [react()],
    
    // Base public path when served in development or production
    base: isDevelopment ? '/' : '/',
    
    // Development server configuration
    server: {
      port: parseInt(env.VITE_PORT || '3000', 10),
      strictPort: true,
      host: true, // Listen on all network interfaces
      open: true, // Open the browser on server start
      proxy: {
        // Proxy API requests to the backend server in development
        '/api': {
          target: `http://${env.VITE_API_HOST || 'localhost'}:${env.VITE_API_PORT || '3001'}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        // Proxy WebSocket connections
        '/ws': {
          target: `ws://${env.VITE_API_HOST || 'localhost'}:${env.VITE_WS_PORT || env.VITE_API_PORT || '3001'}`,
          ws: true,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/ws/, '')
        }
      }
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: env.VITE_GENERATE_SOURCEMAP === 'true',
      minify: isDevelopment ? false : 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDevelopment,
          drop_debugger: !isDevelopment,
        },
      },
      // Ensure static assets are copied correctly
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
    
    // Environment variables to expose to the client
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.0'),
      'import.meta.env.VITE_API_URL': JSON.stringify(isDevelopment ? '/api' : ''), // Empty in production - will use relative URLs
      'import.meta.env.VITE_WS_URL': JSON.stringify(isDevelopment ? 'ws' : 'wss'),
    },
    
    // Resolver configuration
    resolve: {
      alias: {
        '@': '/src', // For easier imports like '@/components/...'
      },
    },
  };
});
