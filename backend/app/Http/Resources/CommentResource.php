<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'post_id' => $this->post_id,
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id ?? null,
                    'name' => $this->user->name ?? null,
                ];
            }),
            'user_id' => $this->user_id,
            'body' => $this->body,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
