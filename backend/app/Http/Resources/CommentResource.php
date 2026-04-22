<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * CommentResource - используется для преобразования модели в JSON‑ответ.
 */

class CommentResource extends JsonResource
{

    // формирует сериализованный массив, который затем превратится в JSON для API‑ответа
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'post_id' => $this->post_id,

            // Отдаём user только если relation загружена; включает avatar
            'user' => $this->whenLoaded('user', function () {
                $user = $this->user;
                return [
                    'id' => $user->id ?? null,
                    'name' => $user->name ?? null,
                    'avatar' => $user->avatar ?? $user->avatar_url ?? null,
                ];
            }),

            'user_id' => $this->user_id,
            'body' => $this->body,
            'is_deleted' => (bool) ($this->is_deleted ?? false),
            'deleted_at' => $this->deleted_at?->toDateTimeString(),
            'deleted_by' => $this->deleted_by,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'parent_id' => $this->parent_id ?? null,

            // children — рекурсивно, если relation загружена
            'children' => $this->whenLoaded('children', function () {
                return CommentResource::collection($this->children);
            }),
        ];
    }
}
