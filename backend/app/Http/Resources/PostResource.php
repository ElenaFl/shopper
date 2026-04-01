<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'user_id' => $this->user_id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'created_at' => $this->created_at,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'avatar' => $this->user->avatar ?? null,
                ];
            }),
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'title' => $this->product->title,
                ];
            }),
        ];
    }
}
