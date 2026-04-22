<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

/**
 * Discount
 * Модель скидки для товара.
 * Параметры: product_id|sku, type (percent|fixed), value, currency, active, starts_at, ends_at, note.
 * Используется для вычисления итоговой цены (priceAfter) и проверки активности скидки (isActive). */

class Discount extends Model {

    use HasFactory;

    protected $fillable = [
        'product_id',
        'sku',
        'type',
        'value',
        'currency',
        'active',
        'starts_at',
        'ends_at',
        'note',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        ];

    // проверяет, действительна ли скидка в текущий момент
    public function isActive(): bool
    {
        if (! $this->active) {
            return false;
        }

        $now = Carbon::now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }

        return true;
    }

    // рассчитывает цену после применения скидки к исходной цене ($originalPrice)
    public function priceAfter($originalPrice): ?float
    {
        if ($originalPrice === null) {
            return null;
        }

        if (!is_numeric($originalPrice)) {
            return null;
        }

        $orig = (float) $originalPrice;

        // значение скидки должно существовать и быть числовым($this - скидка попадает сюда из модели, так как метод вызывается на модели)
        $valRaw = $this->value ?? null;
        if ($valRaw === null || !is_numeric($valRaw)) {
            return null;
        }
        $val = (float) $valRaw;

        // определяется тип
        $type = $this->type ? strtolower((string) $this->type) : 'fixed';

        if ($type === 'percent') {
            // value = 20 => 20%
            $result = $orig * (1 - $val / 100);
        } else {
            // учитывается как фиксированная сумма скидки
            $result = $orig - $val;
        }

        // неотрицательное, округляется до 2 знаков после запятой
        $result = max(0, round($result, 2));

        return $result;
    }

    // обратная связь: скидка принадлежит продукту. // Позволяет получить родительский Product через $discount->product и использовать eager-loading/связки в Eloquent
    public function product() {

        return $this->belongsTo(Product::class, 'product_id');
    }
}
