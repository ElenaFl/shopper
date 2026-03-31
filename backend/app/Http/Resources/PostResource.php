<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PostResource extends JsonResource
{
    protected function resolveImage(string|null $raw): array
    {
        if (! $raw) return [null, null];
        $raw = trim((string)$raw);
        if (preg_match('#^https?://#i', $raw)) {
            return [null, $raw];
        }
        if (preg_match('#(^/?images/)|(/images/)#i', $raw)) {
            $clean = ltrim($raw, '/');
            return [$clean, url($clean)];
        }
        $clean = preg_replace('#^/?(?:storage/)+#', '', preg_replace('#^-+#', '', $raw));
        $rel = trim($clean, '/');
        if (! $rel) return [null, null];
        if (file_exists(public_path($rel))) {
            return [$rel, url($rel)];
        }
        $inImages = 'images/' . ltrim($rel, '/');
        if (file_exists(public_path($inImages))) {
            return [$inImages, url($inImages)];
        }
        return [$rel, url('/storage/' . $rel)];
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
            'comments_count' => $this->when(isset($this->comments), function () {
                return is_array($this->comments) ? count($this->comments) : ($this->comments()->count() ?? 0);
            }),
            'comments' => $this->whenLoaded('comments', function () {
                return CommentResource::collection($this->comments);
            }),
        ];
    }
}
