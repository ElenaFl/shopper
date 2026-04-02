<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductResource extends JsonResource
{
    protected function resolveImage(string|null $raw): array
    {
        if (! $raw) return [null, null];
        $raw = trim((string)$raw);
        if (preg_match('#^https?://#i', $raw)) {
            return [null, $raw];
        }
        if (preg_match('#(^/?images/)|(/images/)#i', $raw)) {
            $clean = ltrim($raw, '/');
            return [$clean, url($clean)];
        }
        $clean = preg_replace('#^/?(?:storage/)+#', '', preg_replace('#^-+#', '', $raw));
        $rel = trim($clean, '/');
        return [$rel ?: null, $rel ? url('/storage/' . $rel) : null];
    }

   public function toArray($request)
{
    [$imgPath, $imgUrl] = $this->resolveImage($this->img ?? null);

    // Найти активную скидку — единоразово.
    $activeDiscount = null;
    if (method_exists($this, 'activeDiscount')) {
        // activeDiscount defined as relation (hasOne) — try to use loaded relation first
        if ($this->relationLoaded('activeDiscount')) {
            $activeDiscount = $this->activeDiscount;
        } else {
            // if not loaded, attempt to fetch a matching active discount via model method (may perform query)
            try {
                $activeDiscount = $this->activeDiscount()->first();
            } catch (\Throwable $e) {
                $activeDiscount = null;
            }
        }
    } elseif ($this->relationLoaded('discounts')) {
        $activeDiscount = collect($this->discounts)->first(fn($d) => method_exists($d, 'isActive') ? $d->isActive() : ($d->active ?? false));
    }

    // Prepare discount payload if present
    $discountPayload = null;
    $priceAfter = null;
    if ($activeDiscount) {
        $priceAfter = method_exists($activeDiscount, 'priceAfter') ? $activeDiscount->priceAfter($this->price) : ($activeDiscount->price_after ?? null);
        $discountPayload = [
            'id' => $activeDiscount->id ?? null,
            'type' => $activeDiscount->type ?? null,
            'value' => isset($activeDiscount->value) ? (float)$activeDiscount->value : null,
            'currency' => $activeDiscount->currency ?? $this->currency ?? null,
            'starts_at' => $activeDiscount->starts_at ? $activeDiscount->starts_at->toISOString() : null,
            'ends_at' => $activeDiscount->ends_at ? $activeDiscount->ends_at->toISOString() : null,
            'active' => (bool) ($activeDiscount->active ?? true),
            'price_after' => $priceAfter !== null ? (float) $priceAfter : null,
        ];
    }

    $price = $this->price !== null ? (float) $this->price : null;
    // prefer explicit final_price accessor if present, otherwise fall back to price_after from discount
    $finalPrice = $this->resource->final_price ?? null;
    if ($finalPrice === null && $priceAfter !== null) {
        $finalPrice = (float) $priceAfter;
    }
    if ($finalPrice !== null) {
        $finalPrice = (float) $finalPrice;
    }

    return [
        'id' => $this->id,
        'title' => $this->title,
        'sku' => $this->sku,
        'price' => $price,
        'currency' => $this->currency,
        'final_price' => $finalPrice,
        'discount' => $discountPayload,
        'description' => $this->description,
        'img' => $imgPath,
        'img_url' => $imgUrl,
        'weight' => $this->weight,
        'dimensions' => $this->dimensions,
        'colours' => $this->colours,
        'material' => $this->material,
        'is_popular' => (bool) ($this->is_popular ?? false),
        'sales_count' => (int) ($this->sales_count ?? 0),
        'popularity_score' => (float) ($this->popularity_score ?? 0),
        'category' => $this->whenLoaded('category', function () {
            return ['id' => $this->category->id, 'title' => $this->category->title];
        }),
        'created_at' => $this->created_at?->toDateTimeString(),
        'updated_at' => $this->updated_at?->toDateTimeString(),
    ];
}
}
