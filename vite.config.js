import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  plugins: [
    {
      name: 'add-clacks-header',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('X-Clacks-Overhead', 'GNU Terry Pratchett');
          next();
        });
      },
    },
  ],
});
