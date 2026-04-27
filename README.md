SHOPPER

интернет‑магазин с backend на Laravel и frontend на React + Vite. Проект содержит адаптивный UI, сборку через Vite и базовую архитектуру frontend/backend для локальной разработки и деплоя.

Технологии

Laravel
React
Vite
Tailwind CSS
Swiper
ESLint, Stylelint(инструменты)

Требования

Node.js >= 16
npm >= 8
Laravel 12
Рекомендуется: OSPanel / Apache

Установка зависимостей:

composer install
composer dump-autoload (автозагрузка классов)
npm install

Использование

Режим разработки

Запуск dev-сервера: npm run dev
Запуск сервера (бекэнд): npm artisan serve; OSPanel

Сборка для production

Собрать проект: npm run build

Структура проекта:

C:\OSPanel\home\shopper.local
├── .git
├── .osp
├── backend
├── database.sqlite
├── frontend
├── node_modules
├── package-lock.json
├── package.json
└── tmp_index.js

directory: 5 file: 4
