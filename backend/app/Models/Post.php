<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Tag;

/**
 * Class Post
 *
 * Eloquent‑модель блога (пост).
 */

class Post extends Model
{
    protected $fillable = [
        'author_id',
        'title',
        'slug',
        'excerpt',
        'body',
        'img',
        'img_thumb',
        'views',
        'published_at',
    ];

    // автоматически приводит атрибуты модели к указанным типам при чтении/записи
    protected $casts = [
        'views' => 'integer',
        'published_at' => 'datetime',
    ];

    // определяет связь «принадлежит» с моделью User; текущая модель имеет внешний ключ author_id
    //  позволяет вызывать $post->author для получения автора поста
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    // определяет связь «один-ко-многим» — у поста много комментариев
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->orderBy('created_at', 'asc');
    }

    // определяет связь многие-ко-многим между постом и тегами через промежуточную таблицу post_tag
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'post_tag');
    }
}
