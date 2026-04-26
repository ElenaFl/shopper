<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;


/**
 * Class ReviewResource
 *
 * Трансформер для отзыва.
 *
 * Возвращает: id, product_id, user_id, rating, comment, name/email автора (из snapshot или relation user),
 * и timestamps.
 *
 * Преобразует модельную коллекцию в массив, пригодный для JSON‑ответа API, контролирует, какие поля и в каком виде уйдут клиенту
 */

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
        // отдается имя автора из самого отзыва (snapshot) если есть, иначе берет из связанной модели User
        'name'       => $this->name ?? optional($this->whenLoaded('user') ? $this->user : null)->name,
        'email'      => $this->email ?? optional($this->whenLoaded('user') ? $this->user : null)->email,
        'created_at' => optional($this->created_at)->toDateTimeString(),
        'updated_at' => optional($this->updated_at)->toDateTimeString(),
    ];
}
}
