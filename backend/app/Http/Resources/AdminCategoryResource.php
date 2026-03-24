<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

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
