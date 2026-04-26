<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 *
 *
/**
 * Class AdminCategoryResource
 *
 * Трансформер для админского API категории.
 *
 * Возвращает: id, title, slug, products_count (если relation products загружена — количество элементов,
 * иначе использует поле products_count, если оно присутствует), created_at, updated_at.
 * Трансформер для админского API категории ( берёт модель (Category) и превращает её в формат, удобный для ответа API (JSON)).
 */

class AdminCategoryResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'slug'        => $this->slug,
            'products_count' => $this->whenLoaded('products') ? $this->products->count() : $this->when(isset($this->products_count), $this->products_count),
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
