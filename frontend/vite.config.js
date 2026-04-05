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
        target: "http://shopper.local",
        changeOrigin: true,
        secure: false,
        // preserveHost может быть полезен при cookie-based auth,
        // но чаще используется changeOrigin: true
        // Включите, если нужно переписывать путь:
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      "/auth": {
        // <- добавлено
        target: "http://shopper.local", // проксируем auth на backend домен
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "shopper.local",
      },
    },
  },
});
