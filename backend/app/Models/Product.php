<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Review;

/**
 * Class Product
 *
 * Eloquent‑модель товара.
 */

class Product extends Model
{
    // Разрешённые для массового заполнения (публичные поля)
    protected $fillable = [
        'title',
        'sku',
        'category_id',
        'price',
        'currency',
        'description',
        'img',
        'weight',
        'dimensions',
        'colours',
        'material',
    ];

    // Касты ( для корректной сериализации)
    protected $casts = [
        'sales_count' => 'integer',
        'reviews_count' => 'integer',
        'rating' => 'float',
        'popularity_score' => 'float',
        'is_popular' => 'boolean',
        'price' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Пересчитать popularity_score для текущего продукта.
     */
    public function recomputePopularityScore(): void
    {
        //берём значение продаж ($this->sales_count). Если оно null — используем 0. Гарантируем числовое значение для дальнейших вычислений.
        $sales = $this->sales_count ?? 0;

        $rating = $this->rating ?? 0;

        // Нормализуем показатель продаж в диапазон (0..1):  при небольших sales значение близко к 0, с ростом sales значение стремится к 1. Формула sales/(sales+100) даёт плавное насыщение: при sales = 0 → 0; при sales = 100 → 0.5; при больших sales → приближается к 1.

        $normalizedSales = $sales > 0 ? ($sales / ($sales + 100)) : 0;
        $normalizedRating = $rating > 0 ? ($rating / 5.0) : 0;

        $score = 0.7 * $normalizedSales + 0.3 * $normalizedRating;

        //Если у продукта явно выставлен флаг is_popular (логическое поле), добавляем бонус +0.1 к скору. Это даёт дополнительную приоритетность вручную отмеченным товарам. $score = max(0, min(1.5, $score));
        if ($this->is_popular) {
            $score += 0.1;
        }

        // ограничиваем результат в диапазоне [0, 1.5]
        $score = max(0, min(1.5, $score));
        // ограничиваем результат в диапазоне [0, 1.5] и присваиваем полю модели
        $this->popularity_score = round($score, 4);

        //сохраняем модель в базу без возникновения событий модели
        $this->saveQuietly();
    }

    /**
     * Scope(масштаб) для популярных товаров. Ограничивает количество возвращаемых популярных товаров значением $limit. По умолчанию вернёт максимум 12 записей.
     */
    public function scopePopular($query, $limit = 12)
    {
        return $query->orderByDesc('popularity_score')
                    ->orderByDesc('sales_count')
                    ->limit($limit);
    }

    // отношение: все скидки на товар (могут быть пустыми)
    public function discounts()
    {
        return $this->hasMany(Discount::class, 'product_id');
    }

    // hasOne отношение: все скидки на товар (могут быть пустыми) hasOne означает, что ожидается не более одной подходящей записи (в данном контексте — одна активная скидка). Возвращается объект отношения
    public function activeDiscount()
    {
        return $this->hasOne(Discount::class, 'product_id')
        //учитывать только записи, у которых поле active = true (только активные скидки).
        ->where('active', true)
        // скидка считается начавшейся, если поле starts_at пусто (NULL) или значение starts_at меньше либо равно текущему времени now()
        ->where(function ($q) {
            $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
        })
        // скидка считается ещё действующей, если ends_at пусто (NULL) или ends_at >= now().
        ->where(function ($q) {
            $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
        });
    }

    // аксессор: final_price
    public function getFinalPriceAttribute()
    {
        // prefer eager-loaded relation if present
        $discount = $this->relationLoaded('activeDiscount') ? $this->activeDiscount : $this->activeDiscount()->first();

        if (! $discount) {
            return (float) $this->price;
        }

        $after = $discount->priceAfter($this->price);
        // если никакой активной скидки не найдено (discount == null), возвращаем обычную цену продукта, приведённую к float
        return $after === null ? (float) $this->price : $after;
    }

    // выставляется рассчитанный процент скидки
    public function getDiscountPercentAttribute()
    {
        //Пытаемся получить текущую активную скидку: если relation activeDiscount заранее загружена (eager-loaded), используем её без дополнительных запросов.Иначе выполняем запрос activeDiscount()->first() для получения первой подходящей записи из БД.
        $discount = $this->relationLoaded('activeDiscount') ? $this->activeDiscount : $this->activeDiscount()->first();
        if (! $discount) return null;
        //Если тип скидки — 'percent', предполагается, что в поле value хранится процент (например 15 для 15%). Возвращаем это значение как float
        if ($discount->type === 'percent') {
            return (float) $discount->value;
        }
        //Если тип скидки — 'fixed' (фиксированная сумма списания) и у продукта есть положительная цена: вычисляем эквивалентный процент скидки относительно исходной цены.
        if ($discount->type === 'fixed' && $this->price > 0) {
            return round(((float)$this->price - max(0, (float)$this->price - (float)$discount->value)) / (float)$this->price * 100, 2);
        }
        // если ни одно из условий не выполнено (например, неизвестный тип скидки или price <= 0 при fixed), возвращаем null
        return null;
    }

    // Метод возвращает объект Discount или null. Используется как централизованный способ получить «активную» скидку для продукта
    public function getActiveDiscountObject()
    {
        // была ли заранее загружена relation discounts
        if ($this->relationLoaded('discounts')) {
            //Оборачиваем $this->discounts в коллекцию и ищем первую запись, которая удовлетворяет условию "активна". first() вернёт первую подходящую модель или null
            $found = collect($this->discounts)->first(function ($d) {
                if (! $d) return false;
                // если у Discount есть метод isActive(), используем его
                if (method_exists($d, 'isActive')) return $d->isActive();
                // или вручную проверяем
                $active = (bool) ($d->active ?? false);
                $startsOk = empty($d->starts_at) || now()->gte($d->starts_at);
                $endsOk = empty($d->ends_at) || now()->lte($d->ends_at);
                return $active && $startsOk && $endsOk;
            });
            // возвращаем true только если все условия выполняются — значит скидка актуальна
            if ($found) return $found;
        }

        // Если нашли подходящую скидку в уже загруженной коллекции — возвращаем её(экономим запросы)
        try {
            return $this->activeDiscount()->first();
        } catch (\Throwable $e) {
            logger()->warning('getActiveDiscountObject error', ['product_id' => $this->id, 'exception' => $e]);
            return null;
        }
    }

    /**
     * Связь с категорией.
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Отзывы для продукта
     */
    public function reviews()
    {
        return $this->hasMany(Review::class, 'product_id', 'id');
    }
}
