<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Category;
use App\Models\Discount;

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

    // Касты (включаем и поля популярности для корректной сериализации)
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
        $sales = $this->sales_count ?? 0;
        $rating = $this->rating ?? 0;

        $normalizedSales = $sales > 0 ? ($sales / ($sales + 100)) : 0;
        $normalizedRating = $rating > 0 ? ($rating / 5.0) : 0;

        $score = 0.7 * $normalizedSales + 0.3 * $normalizedRating;

        if ($this->is_popular) {
            $score += 0.1;
        }

        $score = max(0, min(1.5, $score));

        $this->popularity_score = round($score, 4);
        $this->saveQuietly();
    }

    /**
     * Scope для популярных товаров.
     */
    public function scopePopular($query, $limit = 12)
    {
        return $query->orderByDesc('popularity_score')
                    ->orderByDesc('sales_count')
                    ->limit($limit);
    }

    public function discounts()
    {
        return $this->hasMany(Discount::class, 'sku', 'sku');
    }

    public function activeDiscount()
    {
        if ($this->relationLoaded('discounts')) {
            foreach ($this->discounts as $d) {
                if ($d->isActive()) return $d;
            }
            return null;
        }

        return Discount::where('sku', $this->sku)
                ->where('active', true)
                ->where(function($q){ $now = now(); $q->whereNull('starts_at')->orWhere('starts_at','<=',$now); })
                ->where(function($q){ $now = now(); $q->whereNull('ends_at')->orWhere('ends_at','>=',$now); })
                ->orderByDesc('id')->first();
    }

    /**
     * Связь с категорией.
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
