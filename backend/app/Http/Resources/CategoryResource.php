<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Публичная сериализация категории (возвращает результат контроллера в JSON-формате).
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
