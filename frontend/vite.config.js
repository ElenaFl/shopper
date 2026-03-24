import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: "shopper.local",
    port: 5173,
    strictPort: true,
    proxy: {
      // Проксируем все запросы, начинающиеся с /api, на Laravel dev-сервер
      // Измените target, если Laravel слушает на другом хосте/порту
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        // preserveHost может быть полезен при cookie-based auth,
        // но чаще используется changeOrigin: true
        // Включите, если нужно переписывать путь:
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});
