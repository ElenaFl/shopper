<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;


class ProductResource extends JsonResource
{
    /**
     * Публичная сериализация продукта.
     * Отдаёт минимальные данные + is_popular; скрывает sales_count и popularity_score.
     */
    public function toArray($request)
    {
        return [
            'id'         => $this->id,
            'title'      => $this->title,
            'sku'        => $this->sku,
            'price'      => $this->price,
            'currency'   => $this->currency,
            'img'        => $this->img,
            'dimensions' => $this->dimensions,
            'is_popular' => (bool) $this->is_popular,
            'category'   => new CategoryResource($this->whenLoaded('category')),
        ];
    }
}
