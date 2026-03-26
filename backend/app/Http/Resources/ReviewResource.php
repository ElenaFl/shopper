<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'         => $this->id,
            'product_id' => $this->product_id,
            'user_id'    => $this->user_id,
            'rating'     => (int) $this->rating,
            'comment'    => $this->comment,
            'name'       => $this->name ?? ($this->whenLoaded('user') ? $this->user->name : null),
            'email'      => $this->email ?? null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
