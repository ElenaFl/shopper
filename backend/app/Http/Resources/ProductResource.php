<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use \App\Http\Resources\ReviewResource;

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

        // already an images path (public/images/...)
        if (preg_match('#(^/?images/)|(/images/)#i', $raw)) {
            $clean = ltrim($raw, '/');
            return [$clean, url($clean)];
        }

        // normalize potential storage or public-relative paths
        $clean = preg_replace('#^/?(?:storage/)+#', '', preg_replace('#^-+#', '', $raw));
        $rel = trim($clean, '/');

        if (! $rel) {
            return [null, null];
        }

        // 1) if file exists under public/<rel>, prefer that
        if (file_exists(public_path($rel))) {
            return [$rel, url($rel)];
        }

        // 2) if file exists under public/images/<rel>, prefer that
        $inImages = 'images/' . ltrim($rel, '/');
        if (file_exists(public_path($inImages))) {
            return [$inImages, url($inImages)];
        }

        // 3) fallback to storage URL (public/storage/<rel>)
        return [$rel, url('/storage/' . $rel)];
    }

    public function toArray($request)
    {
        [$imgPath, $imgUrl] = $this->resolveImage($this->img ?? null);
        [$thumbPath, $thumbUrl] = $this->resolveImage($this->img_thumb ?? null);

        $currencyMap = ['USD' => '$', 'RUB' => '₽', 'EUR' => '€', 'GBP' => '£'];
        $currencySymbol = $this->currency ? ($currencyMap[strtoupper($this->currency)] ?? $this->currency) : null;

        // --- active discount (nullable) ---
        // try to get discount object consistently
        $activeDiscount = null;

        // prefer helper if exists
        if (method_exists($this->resource, 'getActiveDiscountObject')) {
            $activeDiscount = $this->resource->getActiveDiscountObject();
        } elseif ($this->relationLoaded('activeDiscount')) {
            $activeDiscount = $this->activeDiscount;
        } elseif ($this->relationLoaded('discounts')) {
            $activeDiscount = collect($this->discounts)->first(fn($d) => method_exists($d, 'isActive') ? $d->isActive() : ($d->active ?? false));
        } else {
            try {
                $activeDiscount = $this->activeDiscount()->first();
            } catch (\Throwable $e) {
                $activeDiscount = null;
            }
        }

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

        // final_price prefer accessor, fallback to price_after
        $finalPrice = $this->resource->final_price ?? null;
        if ($finalPrice === null && $priceAfter !== null) {
            $finalPrice = (float)$priceAfter;
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'sku' => $this->sku,
            'price' => $this->price !== null ? (float) $this->price : null,
            'currency' => $this->currency,
            'currency_symbol' => $currencySymbol,
            'discount' => $discountPayload,
            'final_price' => $finalPrice,
            'description' => $this->description,
            'img' => $imgPath,
            'img_url' => $imgUrl,
            'img_thumb_url' => $thumbUrl ?? $imgUrl,
            'weight' => $this->weight,
            'dimensions' => $this->dimensions,
            'colours' => $this->colours,
            'material' => $this->material,
            'is_popular' => (bool) ($this->is_popular ?? false),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'reviews' => $this->whenLoaded('reviews') ? ReviewResource::collection($this->reviews) : null,
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'category' => $this->whenLoaded('category', function () {
                return ['id' => $this->category->id, 'title' => $this->category->title];
            }),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'views' => $this->views ?? $this->views_count ?? $this->views_total ?? 0,
        ];
    }
}
