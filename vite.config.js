import { defineConfig } from "vite";
export default defineConfig({
  plugins: [
    {
      name: "headers",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (/\.html($|\?)/.test(req.url || "")) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
          }
          res.setHeader("X-Clacks-Overhead", "GNU Terry Pratchett");
          next();
        });
      },
    },
  ],
});