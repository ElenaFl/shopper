<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddForeignKeysToReviewsTable extends Migration
{
    public function up()
    {
        if (! Schema::hasTable('reviews')) {
            return;
        }

        // Включим проверку FK на время операций
        DB::statement('PRAGMA foreign_keys = OFF');

        DB::beginTransaction();
        try {
            // Создать новую таблицу с нужной структурой
            DB::statement(<<<SQL
CREATE TABLE reviews_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
SQL
            );

            // Копируем данные (укажите все поля, которые есть у вас)
            DB::statement('INSERT INTO reviews_new (id, product_id, user_id, rating, comment, created_at, updated_at) SELECT id, product_id, user_id, rating, comment, created_at, updated_at FROM reviews');

            // Удаляем старую и переименовываем
            DB::statement('DROP TABLE reviews');
            DB::statement('ALTER TABLE reviews_new RENAME TO reviews');

            // Включаем FK
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        } finally {
            DB::statement('PRAGMA foreign_keys = ON');
        }

        // Создать индекс на product_id (если нужно)
        Schema::table('reviews', function (\Illuminate\Database\Schema\Blueprint $table) {
            $table->index('product_id');
        });
    }

    public function down()
    {
        // Откат: можно либо не делать ничего, либо вернуть прежнюю таблицу.
        // Для простоты — удалить FK и индекс, оставив структуру.
        if (! Schema::hasTable('reviews')) {
            return;
        }

        // Здесь можно реализовать обратную операцию, но обычно не требуется.
    }
}
