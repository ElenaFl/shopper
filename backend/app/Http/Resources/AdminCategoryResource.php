<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * AdminCategoryResource: трансформер для админского API категории ( берёт модель (Category) и превращает её в формат, удобный для ответа API (JSON)).  Возвращает поля id, title, slug, timestamps и количество товаров (products_count).  products_count берётся из загруженной связи products (count)присутствует).
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
