<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Review;

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

  // relation: all discounts for product (may be empty)
public function discounts()
{
    return $this->hasMany(\App\Models\Discount::class, 'product_id');
}

// hasOne relation to currently active discount (by product_id)
public function activeDiscount()
{
    return $this->hasOne(Discount::class, 'product_id')
        ->where('active', true)
        ->where(function ($q) {
            $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
        })
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
        return $after === null ? (float) $this->price : $after;
    }

    // optionally: expose discount percent computed
    public function getDiscountPercentAttribute()
    {
        $discount = $this->relationLoaded('activeDiscount') ? $this->activeDiscount : $this->activeDiscount()->first();
        if (! $discount) return null;
        if ($discount->type === 'percent') {
            return (float) $discount->value;
        }
        if ($discount->type === 'fixed' && $this->price > 0) {
            return round(((float)$this->price - max(0, (float)$this->price - (float)$discount->value)) / (float)$this->price * 100, 2);
        }
        return null;
    }

// helper that returns Discount model or null
public function getActiveDiscountObject()
{
    // If discounts collection was eager-loaded, prefer scanning it
    if ($this->relationLoaded('discounts')) {
        $found = collect($this->discounts)->first(function ($d) {
            if (! $d) return false;
            if (method_exists($d, 'isActive')) return $d->isActive();
            $active = (bool) ($d->active ?? false);
            $startsOk = empty($d->starts_at) || now()->gte($d->starts_at);
            $endsOk = empty($d->ends_at) || now()->lte($d->ends_at);
            return $active && $startsOk && $endsOk;
        });
        if ($found) return $found;
    }

    // fallback to relation query (safe)
    try {
        return $this->activeDiscount()->first();
    } catch (\Throwable $e) {
        \Log::warning('getActiveDiscountObject error: '.$e->getMessage());
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
