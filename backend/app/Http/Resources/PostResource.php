<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use App\Http\Resources\CommentResource;

class PostResource extends JsonResource
{
    protected function resolveImage(?string $raw): array
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

        // проверяем файл в public (is_file безопаснее)
        $publicPath = public_path($relative);
        if (is_file($publicPath)) {
            $absolute .= '?v=' . filemtime($publicPath);
        }

        return [$relative, $absolute];
    }

    public function toArray($request)
    {
        [$imgPath, $imgUrl] = $this->resolveImage($this->img ?? null);
        [$thumbPath, $thumbUrl] = $this->resolveImage($this->img_thumb ?? null);

        // ensure collections
        $tags = $this->relationLoaded('tags') ? ($this->tags ?? collect()) : collect();
        $comments = $this->relationLoaded('comments') ? ($this->comments ?? collect()) : collect();

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
                $author = $this->author;
                return $author ? [
                    'id' => $author->id ?? null,
                    'name' => $author->name ?? null,
                ] : null;
            }),
            'views' => isset($this->views) ? (int)$this->views : 0,
            'published_at' => $this->published_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
            'comments' => $this->whenLoaded('comments', function () use ($comments) {
                return CommentResource::collection($comments);
            }),
            'comments_count' => $this->relationLoaded('comments') ? count($comments) : ($this->comments_count ?? 0),
            'tags' => $this->whenLoaded('tags', function () use ($tags) {
                return $tags->map(fn($t) => [
                    'id' => $t->id,
                    'name' => $t->name ?? null,
                    'slug' => $t->slug ?? null,
                ])->values()->all();
            }),
        ];
    }
}
