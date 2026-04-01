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
        'rating'     => (int) ($this->rating ?? 0),
        'comment'    => $this->comment,
        // safe access to user name — use optional() and whenLoaded
        'name'       => $this->name ?? optional($this->whenLoaded('user') ? $this->user : null)->name,
        'email'      => $this->email ?? optional($this->whenLoaded('user') ? $this->user : null)->email,
        'created_at' => optional($this->created_at)->toDateTimeString(),
        'updated_at' => optional($this->updated_at)->toDateTimeString(),
    ];
}
}
