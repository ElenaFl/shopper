<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    /**
     * Публичная сериализация категории.
     */
    public function toArray($request)
    {
        return [
            'id'    => $this->id,
            'title' => $this->title,
            'slug'  => $this->slug,
        ];
    }
}
