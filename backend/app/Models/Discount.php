<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Carbon;

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

    /**
 * Calculate price after discount.
 *
 * @param  float|int|string|null  $originalPrice
 * @return float|null  Price after discount rounded to 2 decimals, or null if cannot compute
 */
public function priceAfter($originalPrice): ?float
{
    // validate original price (DB DECIMAL may come as string)
    if ($originalPrice === null) {
        return null;
    }
    if (!is_numeric($originalPrice)) {
        return null;
    }
    $orig = (float) $originalPrice;

    // discount value must exist and be numeric
    $valRaw = $this->value ?? null;
    if ($valRaw === null || !is_numeric($valRaw)) {
        return null;
    }
    $val = (float) $valRaw;

    // decide type
    $type = $this->type ? strtolower((string) $this->type) : 'fixed';

    if ($type === 'percent') {
        // value = 20 => 20%
        $result = $orig * (1 - $val / 100);
    } else {
        // treat as fixed amount off
        $result = $orig - $val;
    }

    // avoid negative and round to 2 decimals
    $result = max(0, round($result, 2));

    return $result;
}
}
