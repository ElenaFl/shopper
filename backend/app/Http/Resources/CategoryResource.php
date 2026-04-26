<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Class CategoryResource
 *
 * Публичный трансформер для категории.
 *
 * Возвращает минимальный набор полей для публичного API: id, title, slug.
 */

class CategoryResource extends JsonResource
{

    public function toArray($request)
    {
        return [
            'id'    => $this->id,
            'title' => $this->title,
            'slug'  => $this->slug,
        ];
    }
}
