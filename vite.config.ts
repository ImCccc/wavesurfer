import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 代理
  server: {
    host: "0.0.0.0",
    proxy: {
      "/rpc": {
        target: "https://smart-cloud-web.dev.inrobot.cloud",
        changeOrigin: true,
      },
    },
  },
});
