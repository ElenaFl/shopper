<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    protected function resolveImage(string|null $raw): array
    {
        if (! $raw) {
            return [null, null];
        }

        $raw = trim((string) $raw);

        // full URL
        if (preg_match('#^https?://#i', $raw)) {
            return [null, $raw];
        }

        // public images folder (public/images/...)
        if (preg_match('#(^/?images/)|(/images/)#i', $raw)) {
            $clean = ltrim($raw, '/');
            return [$clean, url($clean)];
        }

        // storage relative path (products/xxx.jpg or /storage/products/xxx.jpg etc.)
        $clean = preg_replace('#^/?(?:storage/)+#', '', preg_replace('#^-+#', '', $raw));
        $rel = trim($clean, '/');
        return [$rel ?: null, $rel ? url('/storage/' . $rel) : null];
    }

    public function toArray($request)
    {
        [$imgPath, $imgUrl] = $this->resolveImage($this->img ?? null);
        [$thumbPath, $thumbUrl] = $this->resolveImage($this->img_thumb ?? null);

        $currencyMap = ['USD' => '$', 'RUB' => '₽', 'EUR' => '€', 'GBP' => '£'];
        $currencySymbol = $this->currency ? ($currencyMap[strtoupper($this->currency)] ?? $this->currency) : null;

         // --- active discount (nullable) ---
        $activeDiscount = null;
        if (method_exists($this, 'activeDiscount')) {
            $activeDiscount = $this->activeDiscount();
        } elseif ($this->relationLoaded('discounts')) {
            $activeDiscount = collect($this->discounts)->first(fn($d) => method_exists($d, 'isActive') ? $d->isActive() : ($d->active ?? false));
        }

        $discount = null;
        if ($activeDiscount) {
            $discount = [
                'type' => $activeDiscount->type ?? null,
                'value' => $activeDiscount->value ?? null,
                'currency' => $activeDiscount->currency ?? $this->currency ?? null,
                'price_after' => method_exists($activeDiscount, 'priceAfter')
                    ? $activeDiscount->priceAfter($this->price)
                    : (isset($activeDiscount->price_after) ? $activeDiscount->price_after : null),
            ];
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'sku' => $this->sku,
            'price' => $this->price !== null ? number_format((float)$this->price, 2, '.', '') : null,
            'currency' => $this->currency,
            'currency_symbol' => $currencySymbol,
            'discount' => $discount,
            'description' => $this->description,
            'img' => $imgPath,
            'img_url' => $imgUrl,
            'img_thumb_url' => $thumbUrl,
            'weight' => $this->weight,
            'dimensions' => $this->dimensions,
            'colours' => $this->colours,
            'material' => $this->material,
            'is_popular' => (bool) ($this->is_popular ?? false),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'category' => $this->whenLoaded('category', function () {
                return ['id' => $this->category->id, 'title' => $this->category->title];
            }),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
