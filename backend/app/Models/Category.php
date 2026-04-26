<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Class Category
 *
 * Eloquent‑модель категорий товаров.
 * Хранит поля title и slug, обеспечивает связь hasMany с Product и предоставляет утилиту generateUniqueSlug() для генерации уникального URL‑дружелюбного slug (с опцией игнорирования текущего id при обновлении). Полезна для управления категориями в админке и вывода их в публичном API
 */

class Category extends Model
{
    // разрешённые для массового заполнения поля (через методы create(), save())
    protected $fillable = [
        'title',
        'slug',
    ];

    protected $casts = [
        // приведение типов ('is_active' => 'boolean')
    ];

    // связь с products, определено отношение
    public function products()
    {
        return $this->hasMany(\App\Models\Product::class);
    }

    /**
     * Генерирует уникальный slug для модели.
     *
     *  Category::generateUniqueSlug('Gold Rings' -> "gold-rings" или "gold-rings-1..-2");
     *  Category::generateUniqueSlug('Gold Rings', $ignoreId);
     *
     * @param string $title  Исходный заголовок
     * @param int|null $ignoreId ID записи, которую нужно игнорировать при проверке (для update)
     * @return string
     */
    public static function generateUniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 0;

        while (true) {
            $query = static::where('slug', $slug);
            if ($ignoreId) {
                $query->where('id', '!=', $ignoreId);
            }

            if (! $query->exists()) {
                return $slug;
            }

            $i++;
            $slug = $base . '-' . $i;
        }
    }
}
