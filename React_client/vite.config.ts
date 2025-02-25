import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: "window", // Ensure global is defined for browser usage
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "readable-stream": "vite-compatible-readable-stream",
    },
  },
});
