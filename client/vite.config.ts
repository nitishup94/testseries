import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/testseries/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/testseries/server': {
        target: 'https://nitish.mystudyplanner.in/testseries/server',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/testseries\/server/, ''),
      },
      '/uploads': 'https://nitish.mystudyplanner.in/testseries/server',
    },
  },
});
