import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "redirect-base-no-slash",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/shiftly") {
            req.url = "/shiftly/";
          }
          next();
        });
      },
    },
  ],
  base: "/shiftly/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (["react", "react-dom", "react-router-dom"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-react";
            if (["@reduxjs/toolkit", "react-redux"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-redux";
            if (["@mui/icons-material"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-mui-icons";
            if (["@mui/material", "@emotion/react", "@emotion/styled", "@emotion/cache"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-mui-core";
            if (["@mui/x-date-pickers", "@date-io/date-fns", "date-fns"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-mui-pickers";
            if (["notistack", "stylis-plugin-rtl", "stylis"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-ui";
            if (["i18next", "react-i18next"].some((p) => id.includes(`/node_modules/${p}/`))) return "vendor-i18n";
            if (id.includes("/node_modules/axios/")) return "vendor-utils";
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["node_modules", ".claude/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      exclude: ["node_modules/", "src/test/", "**/*.config.ts", "**/*. d.ts"],
    },
  },
});
