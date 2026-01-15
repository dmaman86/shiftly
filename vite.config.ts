import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/shiftly/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          "vendor-react": [
            "react",
            "react-dom",
            "react-router-dom",
          ],
          // Redux state management
          "vendor-redux": [
            "@reduxjs/toolkit",
            "react-redux",
          ],
          // Material-UI core components
          "vendor-mui-core": [
            "@mui/material",
            "@emotion/react",
            "@emotion/styled",
            "@emotion/cache",
          ],
          // Material-UI icons (separate because it's large)
          "vendor-mui-icons": [
            "@mui/icons-material",
          ],
          // Material-UI date pickers
          "vendor-mui-pickers": [
            "@mui/x-date-pickers",
            "@mui/x-date-pickers-pro",
            "@date-io/date-fns",
            "date-fns",
          ],
          // Other UI libraries
          "vendor-ui": [
            "notistack",
            "stylis",
            "stylis-plugin-rtl",
          ],
          // Utilities
          "vendor-utils": [
            "axios",
            "uuid",
          ],
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
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      exclude: ["node_modules/", "src/test/", "**/*.config.ts", "**/*. d.ts"],
    },
  },
});
