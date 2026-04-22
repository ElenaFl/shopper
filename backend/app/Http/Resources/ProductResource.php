<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use \App\Http\Resources\ReviewResource;

/**
 * ProductResource превращает модель Product в массив/JSON для API. Здесь производится нормализация изображений, расчёт итоговой цены со скидкой, формирование  структуры полей и условный вывод связанных данных (reviews, category) -- какие поля с какими ключами будут отданы по API
 */

class ProductResource extends JsonResource
{

    /**
     * Вспомогательный метод для нормализации значения поля изображения. Вход: строка (пути/URL) или null. Назначение - преобразовать любое значение поля изображения ($raw) в пару [локальный путь|null, полный URL|null].
     */
    protected function resolveImage(string|null $raw): array
    {
        if (! $raw) {
            return [null, null];
        }

        $raw = trim((string) $raw);

        // Полный URL (внешняя ссылка): if (preg_match('#^https?://#i', $raw)) { return [null, $raw]; } Если $raw начинается с "http://" или "https://", считаем что это уже полный URL и возвращаем [null, $raw].
        if (preg_match('#^https?://#i', $raw)) {
            return [null, $raw];
        }

        // путь уже внутри папки images: (public/images/...) , убираем ведущий слэш и возвращаем путь и полный URL через url($clean).
        if (preg_match('#(^/?images/)|(/images/)#i', $raw)) {
            $clean = ltrim($raw, '/');
            return [$clean, url($clean)];
        }

        // очистка возможных префиксов storage/ или ведущих дефисов: $clean = preg_replace('#^/?(?:storage/)+#', '', preg_replace('#^-+#', '', $raw)); $rel = trim($clean, '/'); Убираем повторяющиеся префиксы "storage/" и ведущие минусы, затем обрезаем слэши
        $clean = preg_replace('#^/?(?:storage/)+#', '', preg_replace('#^-+#', '', $raw));
        $rel = trim($clean, '/');

        //Если после очистки ничего не осталось: if (! $rel) { return [null, null]; } Если $rel пустой — возвращаем [null, null]
        if (! $rel) {
            return [null, null];
        }

        // проверяем, есть ли файл в директории public/<rel> на сервере. Если есть — возвращаем путь и URL.
        if (file_exists(public_path($rel))) {
            return [$rel, url($rel)];
        }

        //Иначе пробуем public/images/<rel>: $inImages = 'images/' . ltrim($rel, '/'); if (file_exists(public_path($inImages))) { return [$inImages, url($inImages)]; } Иногда путь указан без префикса images, но файл лежит в public/images/. Проверяем этот вариант и возвращаем соответствующий путь/URL, если найден
        $inImages = 'images/' . ltrim($rel, '/');
        if (file_exists(public_path($inImages))) {
            return [$inImages, url($inImages)];
        }

        //Иначе пробуем public/images/<rel>: $inImages = 'images/' . ltrim($rel, '/'); if (file_exists(public_path($inImages))) { return [$inImages, url($inImages)]; } Иногда путь указан без префикса images, но файл лежит в public/images/. Проверяем этот вариант и возвращаем соответствующий путь/URL, если найден
        return [$rel, url('/storage/' . $rel)];
    }




    public function toArray($request)
    {

        //Нормализует значения полей img и img_thumb в пару [локальный путь, полный URL] через вспомогательный метод resolveImage.
        [$imgPath, $imgUrl] = $this->resolveImage($this->img ?? null);
        [$thumbPath, $thumbUrl] = $this->resolveImage($this->img_thumb ?? null);

        //Подбирает символ валюты по коду (USD/RUB/EUR/GBP). Если код неизвестен — возвращает сам код. Если currency отсутствует — null
        $currencyMap = ['USD' => '$', 'RUB' => '₽', 'EUR' => '€', 'GBP' => '£'];
        $currencySymbol = $this->currency ? ($currencyMap[strtoupper($this->currency)] ?? $this->currency) : null;

        // Поиск активной скидки (activeDiscount)
        $activeDiscount = null;
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

        $finalPrice = $this->resource->final_price ?? null;
        if ($finalPrice === null && $priceAfter !== null) {
            $finalPrice = (float)$priceAfter;
        }

        // формирование итогового массива (ответа)
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
