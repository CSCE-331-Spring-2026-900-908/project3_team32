import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
<<<<<<< HEAD
      '/api': {
        target: 'http://localhost:5001',
=======
      "/api": {
        target: "http://localhost:5001",
>>>>>>> a4ab62ab57733485d378af52832b6b51e1814fa9
        changeOrigin: true,
      },
    },
  },
});
