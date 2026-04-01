<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    protected function resolveImage(string|null $raw): array
{
    if (! $raw) {
        return [null, null];
    }

    // нормализуем строку: убираем ведущие/лишние пробелы и слеши
    $clean = trim((string) $raw);
    $clean = ltrim($clean, '/');

    if ($clean === '') {
        return [null, null];
    }

    // относительный путь (в базе/ресурсе)
    $relative = $clean;

    // абсолютный URL через helper url()
    $absolute = url($relative);
if (file_exists(public_path($relative))) {
    $absolute .= '?v=' . filemtime(public_path($relative));
}

    return [$relative, $absolute];
}

    public function toArray($request)
    {
        [$imgPath, $imgUrl] = $this->resolveImage($this->img ?? null);
        [$thumbPath, $thumbUrl] = $this->resolveImage($this->img_thumb ?? null);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'body' => $this->body,
            'img' => $imgPath,
            'img_url' => $imgUrl,
            'img_thumb_url' => $thumbUrl ?? $imgUrl,
            'author' => $this->whenLoaded('author', function () {
                return [
                    'id' => $this->author->id ?? null,
                    'name' => $this->author->name ?? null,
                ];
            }),
            'views' => $this->views ?? 0,
            'published_at' => $this->published_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'comments' => $this->whenLoaded('comments', function () {
                return CommentResource::collection($this->comments);
            }),
            'comments_count' => $this->comments_count ?? ($this->whenLoaded('comments') ? count($this->comments) : 0),
            'tags' => $this->whenLoaded('tags', function () {
                return $this->tags->map(fn($t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'slug' => $t->slug,
                ])->values();
            }),
        ];
    }
}
