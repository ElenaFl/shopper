<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * AdminProductResource
 * Трансформер (JSON Resource) для админского API продукта.
 * Формирует безопасный и удобный JSON‑ответ со следующими задачами:
 * Нормализует изображение (локальный путь и публичный URL) через resolveImage().
 * Определяет активную скидку (activeDiscount) в приоритетном порядке: relation loaded → relation query → перебор discounts.
 * Вычисляет final_price: предпочитает $resource->final_price, иначе использует рассчитанную цену после скидки.
 * Возвращает набор полей: id, title, sku, price, currency, final_price, discount, description, img/img_url, характеристики (weight, dimensions, colours, material), метрики (is_popular, sales_count, popularity_score), category (если загружена), timestamps.
 */

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

        //ищет активную скидку.
        $activeDiscount = null;
        if (method_exists($this, 'activeDiscount')) {
            // activeDiscount определен как отношение (hasOne) — сначала  будет использовать загруженное отношение
            if ($this->relationLoaded('activeDiscount')) {
                $activeDiscount = $this->activeDiscount;
            } else {
                // если не загружено, попытайтся получить соответствующую активную скидку с помощью метода model
                try {
                    $activeDiscount = $this->activeDiscount()->first();
                } catch (\Throwable $e) {
                    $activeDiscount = null;
                }
            }
        // иначе - если метод activeDiscount не существует, но загружена связь discounts (relation discounts): код берёт коллекцию $this->discounts (предположительно hasMany) и находит первую скидку, для которой isActive() возвращает true (если такой метод есть у модели скидки), либо использует булево поле active (если метода нет).
        } elseif ($this->relationLoaded('discounts')) {
            $activeDiscount = collect($this->discounts)->first(fn($d) => method_exists($d, 'isActive') ? $d->isActive() : ($d->active ?? false));
        }

    // информация о скидках
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
    // строка безопасно получает цену продукта из модели и приводит её к числу с плавающей запятой или ставит null, если цена отсутствует
    $price = $this->price !== null ? (float) $this->price : null;
    // вычисляет окончательную (финальную) цену товара, отдавая приоритет уже вычисленному accessor'у final_price в ресурсе, а если его нет — подставляя цену после применённой скидки (priceAfter). В конце явно приводит результат к float, если он не null.
    $finalPrice = $this->resource->final_price ?? null;
    if ($finalPrice === null && $priceAfter !== null) {
        $finalPrice = (float) $priceAfter;
    }
    if ($finalPrice !== null) {
        $finalPrice = (float) $finalPrice;
    }

    //возвращает массив значений в json-формате
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
