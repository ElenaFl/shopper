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
            'price' => $this->price !== null ? (float)$this->price : null,
            'currency' => $this->currency,
            'discount' => $discount,
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
